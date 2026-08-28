import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/types/audit.types';
import { CreateCouponDto, UpdateCouponDto } from './dto/coupon.dto';

@Injectable()
export class CouponsService {
  private readonly logger = new Logger(CouponsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async validate(code: string, amount: number, userId?: number) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }
    if (!coupon.active) {
      throw new BadRequestException('Coupon is no longer active');
    }

    const now = new Date();
    if (coupon.startsAt && now < coupon.startsAt) {
      throw new BadRequestException('Coupon is not yet valid');
    }
    if (now > coupon.expiresAt) {
      throw new BadRequestException('Coupon has expired');
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }
    if (amount < coupon.minPurchase) {
      throw new BadRequestException(`Minimum purchase of ₹${coupon.minPurchase} required`);
    }

    if (userId && coupon.perUserLimit) {
      const userUsageCount = await this.prisma.couponUsage.count({
        where: { couponId: coupon.id, userId },
      });
      if (userUsageCount >= coupon.perUserLimit) {
        throw new BadRequestException('You have reached the usage limit for this coupon');
      }
    }

    let calculatedDiscount: number;
    if (coupon.type === 'PERCENTAGE') {
      calculatedDiscount = Math.round((amount * coupon.discount) / 100);
    } else {
      calculatedDiscount = coupon.discount;
    }

    if (coupon.maxDiscount && calculatedDiscount > coupon.maxDiscount) {
      calculatedDiscount = coupon.maxDiscount;
    }
    calculatedDiscount = Math.min(calculatedDiscount, amount);

    return {
      success: true,
      coupon: {
        id: coupon.id,
        code: coupon.code,
        type: coupon.type,
        discount: coupon.discount,
        maxDiscount: coupon.maxDiscount,
        calculatedDiscount,
      },
    };
  }

  async apply(code: string, userId: number, checkoutId?: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }
    if (!coupon.active) {
      throw new BadRequestException('Coupon is no longer active');
    }

    const now = new Date();
    if (coupon.startsAt && now < coupon.startsAt) {
      throw new BadRequestException('Coupon is not yet valid');
    }
    if (now > coupon.expiresAt) {
      throw new BadRequestException('Coupon has expired');
    }
    if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('Coupon usage limit reached');
    }

    if (coupon.perUserLimit) {
      const userUsageCount = await this.prisma.couponUsage.count({
        where: { couponId: coupon.id, userId },
      });
      if (userUsageCount >= coupon.perUserLimit) {
        throw new BadRequestException('You have reached the usage limit for this coupon');
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.coupon.update({
        where: { id: coupon.id },
        data: { usedCount: { increment: 1 } },
      });

      await tx.couponUsage.create({
        data: {
          couponId: coupon.id,
          userId,
          orderId: checkoutId || null,
        },
      });
    });

    this.logger.log(`Coupon ${code} applied by user ${userId}`);
    return { success: true, message: 'Coupon applied', coupon };
  }

  async consumeCoupon(couponCode: string, userId: number, checkoutId: string) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code: couponCode } });
    if (!coupon) return;
    if (!coupon.active) return;

    await this.prisma.$transaction(async (tx) => {
      // Lock the coupon row so usage-limit enforcement is race-safe.
      const locked = await tx.coupon.findUnique({ where: { id: coupon.id } });
      if (!locked || !locked.active) return;
      if (locked.usageLimit && locked.usedCount >= locked.usageLimit) return;

      const existing = await tx.couponUsage.findFirst({
        where: { couponId: coupon.id, userId, orderId: null },
      });

      if (existing) {
        await tx.couponUsage.update({
          where: { id: existing.id },
          data: { orderId: checkoutId },
        });
      } else {
        const used = await tx.couponUsage.count({
          where: { couponId: coupon.id, userId },
        });
        if (locked.perUserLimit && used >= locked.perUserLimit) return;

        await tx.couponUsage.create({
          data: { couponId: coupon.id, userId, orderId: checkoutId },
        });
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { increment: 1 } },
        });
      }
    });
  }

  async releaseCoupon(couponCode: string, userId: number) {
    const coupon = await this.prisma.coupon.findUnique({ where: { code: couponCode } });
    if (!coupon) return;

    const usage = await this.prisma.couponUsage.findFirst({
      where: {
        couponId: coupon.id,
        userId,
        orderId: null,
      },
    });

    if (usage) {
      await this.prisma.$transaction(async (tx) => {
        await tx.couponUsage.delete({ where: { id: usage.id } });
        await tx.coupon.update({
          where: { id: coupon.id },
          data: { usedCount: { decrement: 1 } },
        });
      });
    }
  }

  async findAll(filters?: { active?: boolean; search?: string }) {
    const where: any = {};
    if (filters?.active !== undefined) {
      where.active = filters.active;
    }
    if (filters?.search) {
      where.code = { contains: filters.search };
    }

    return this.prisma.coupon.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { _count: { select: { couponUsages: true } } },
    });
  }

  async findOne(id: number) {
    const coupon = await this.prisma.coupon.findUnique({
      where: { id },
      include: { _count: { select: { couponUsages: true } } },
    });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }
    return coupon;
  }

  async create(dto: CreateCouponDto) {
    const existing = await this.prisma.coupon.findUnique({ where: { code: dto.code } });
    if (existing) {
      throw new BadRequestException('Coupon code already exists');
    }

    if (dto.type === 'PERCENTAGE' && dto.discount > 100) {
      throw new BadRequestException('Percentage discount cannot exceed 100%');
    }

    return this.prisma.coupon.create({
      data: {
        code: dto.code.toUpperCase(),
        type: dto.type,
        discount: dto.discount,
        minPurchase: dto.minPurchase || 0,
        maxDiscount: dto.maxDiscount || null,
        usageLimit: dto.usageLimit || null,
        perUserLimit: dto.perUserLimit || 1,
        startsAt: dto.startsAt ? new Date(dto.startsAt) : null,
        expiresAt: new Date(dto.expiresAt),
        active: dto.active !== undefined ? dto.active : true,
      },
    }).then(async (coupon) => {
      await this.auditService.log({
        action: AuditAction.COUPON_CREATED,
        entityType: 'Coupon',
        entityId: coupon.id,
        details: { code: coupon.code, discount: coupon.discount },
      });
      return coupon;
    });
  }

  async update(id: number, dto: UpdateCouponDto) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    if (dto.code && dto.code !== coupon.code) {
      const existing = await this.prisma.coupon.findUnique({ where: { code: dto.code } });
      if (existing) {
        throw new BadRequestException('Coupon code already exists');
      }
    }

    const data: any = {};
    if (dto.code) data.code = dto.code.toUpperCase();
    if (dto.type) data.type = dto.type;
    if (dto.discount !== undefined) data.discount = dto.discount;
    if (dto.minPurchase !== undefined) data.minPurchase = dto.minPurchase;
    if (dto.maxDiscount !== undefined) data.maxDiscount = dto.maxDiscount;
    if (dto.usageLimit !== undefined) data.usageLimit = dto.usageLimit;
    if (dto.perUserLimit !== undefined) data.perUserLimit = dto.perUserLimit;
    if (dto.startsAt !== undefined) data.startsAt = dto.startsAt ? new Date(dto.startsAt) : null;
    if (dto.expiresAt) data.expiresAt = new Date(dto.expiresAt);
    if (dto.active !== undefined) data.active = dto.active;

    return this.prisma.coupon.update({ where: { id }, data }).then(async (coupon) => {
      await this.auditService.log({
        action: AuditAction.COUPON_UPDATED,
        entityType: 'Coupon',
        entityId: id,
        details: { updatedFields: Object.keys(data) },
      });
      return coupon;
    });
  }

  async remove(id: number) {
    const coupon = await this.prisma.coupon.findUnique({ where: { id } });
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }

    await this.prisma.coupon.delete({ where: { id } });
    return { success: true, message: 'Coupon deleted' };
  }
}
