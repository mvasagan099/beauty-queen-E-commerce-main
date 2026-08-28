import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { PricingItem, PricingBreakdown, PricingContext, CouponResult } from './types/pricing.types';

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);

  constructor(private prisma: PrismaService) {}

  async calculatePricing(context: PricingContext): Promise<PricingBreakdown> {
    const itemsWithProducts = await this.validateAndEnrichItems(context.items);

    const items = itemsWithProducts.map((item) => {
      const mrp = item.mrp || item.unitPrice;
      const lineDiscount = Math.max(0, (mrp - item.unitPrice) * item.quantity);
      const lineTotal = item.unitPrice * item.quantity;
      return { ...item, lineTotal, lineDiscount, mrp };
    });

    const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
    const productDiscount = items.reduce((sum, item) => sum + item.lineDiscount, 0);

    let couponDiscount = 0;
    let couponResult: CouponResult | null = null;
    if (context.couponCode) {
      couponResult = await this.calculateCouponDiscount(context.couponCode, subtotal, context.userId);
      couponDiscount = couponResult.calculatedDiscount;
    }

    const afterCoupon = Math.max(0, subtotal - couponDiscount);

    const shipping = await this.calculateShipping(afterCoupon, context.pincode);

    const tax = await this.calculateTax(afterCoupon, context.pincode);

    const total = Math.max(0, afterCoupon + shipping + tax);

    this.logger.log(
      `Pricing: subtotal=${subtotal}, productDiscount=${productDiscount}, couponDiscount=${couponDiscount}, shipping=${shipping}, tax=${tax}, total=${total}`,
    );

    return {
      items,
      subtotal,
      productDiscount,
      couponDiscount,
      shipping,
      tax,
      total,
    };
  }

  private async validateAndEnrichItems(items: PricingItem[]) {
    const enriched = [];
    for (const item of items) {
      const product = await this.prisma.product.findFirst({
        where: { id: item.productId, deletedAt: null },
      });
      if (!product) {
        throw new BadRequestException(`Product ${item.productId} not found`);
      }

      const unitPrice = product.price || 0;
      const mrp = product.mrp || unitPrice;

      enriched.push({
        ...item,
        name: product.name || 'Unknown',
        unitPrice,
        mrp,
      });
    }
    return enriched;
  }

  async calculateCouponDiscount(
    code: string,
    subtotal: number,
    userId?: number,
  ): Promise<CouponResult> {
    const coupon = await this.prisma.coupon.findUnique({ where: { code } });
    if (!coupon) {
      throw new BadRequestException('Coupon not found');
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
    if (subtotal < coupon.minPurchase) {
      throw new BadRequestException(
        `Minimum purchase of ₹${coupon.minPurchase} required. Current: ₹${subtotal}`,
      );
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
      calculatedDiscount = Math.round((subtotal * coupon.discount) / 100);
    } else {
      calculatedDiscount = coupon.discount;
    }

    if (coupon.maxDiscount && calculatedDiscount > coupon.maxDiscount) {
      calculatedDiscount = coupon.maxDiscount;
    }

    calculatedDiscount = Math.min(calculatedDiscount, subtotal);

    return {
      code: coupon.code,
      type: coupon.type,
      discount: coupon.discount,
      calculatedDiscount,
    };
  }

  private async calculateShipping(subtotal: number, pincode?: string): Promise<number> {
    const config = await this.prisma.siteConfig.findUnique({
      where: { key: 'shipping' },
    });

    if (!config) {
      return 0;
    }

    const rules = config.value as any;
    if (rules.freeShippingThreshold && subtotal >= rules.freeShippingThreshold) {
      return 0;
    }

    if (rules.baseCharge !== undefined) {
      let charge = rules.baseCharge;
      if (pincode && rules.zoneOverrides) {
        const zone = rules.zoneOverrides[pincode.substring(0, 3)];
        if (zone !== undefined) {
          charge = zone;
        }
      }
      return charge;
    }

    return 0;
  }

  private async calculateTax(subtotal: number, _pincode?: string): Promise<number> {
    const config = await this.prisma.siteConfig.findUnique({
      where: { key: 'tax' },
    });

    if (!config) {
      return 0;
    }

    const rules = config.value as any;
    if (rules.gstRate) {
      return Math.round((subtotal * rules.gstRate) / 100);
    }

    return 0;
  }
}
