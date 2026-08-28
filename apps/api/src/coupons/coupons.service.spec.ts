import { Test, TestingModule } from '@nestjs/testing';
import { CouponsService } from './coupons.service';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('CouponsService', () => {
  let service: CouponsService;
  let prisma: Record<string, any>;
  let auditService: Record<string, any>;

  const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  const pastDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);

  const percentageCoupon = {
    id: 1,
    code: 'SAVE10',
    type: 'PERCENTAGE',
    discount: 10,
    minPurchase: 500,
    maxDiscount: 200,
    usageLimit: 100,
    usedCount: 5,
    perUserLimit: 1,
    startsAt: null,
    expiresAt: futureDate,
    active: true,
  };

  const fixedCoupon = {
    id: 2,
    code: 'FLAT100',
    type: 'FIXED_AMOUNT',
    discount: 100,
    minPurchase: 300,
    maxDiscount: null,
    usageLimit: 50,
    usedCount: 10,
    perUserLimit: 2,
    startsAt: null,
    expiresAt: futureDate,
    active: true,
  };

  const expiredCoupon = {
    ...percentageCoupon,
    id: 3,
    code: 'EXPIRED',
    expiresAt: pastDate,
  };

  const inactiveCoupon = {
    ...percentageCoupon,
    id: 4,
    code: 'INACTIVE',
    active: false,
  };

  beforeEach(async () => {
    prisma = {
      coupon: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      couponUsage: {
        count: jest.fn(),
        create: jest.fn(),
        findFirst: jest.fn(),
        updateMany: jest.fn(),
        delete: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    auditService = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CouponsService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<CouponsService>(CouponsService);
  });

  describe('validate', () => {
    it('should validate a valid percentage coupon', async () => {
      prisma.coupon.findUnique.mockResolvedValue(percentageCoupon);
      prisma.couponUsage.count.mockResolvedValue(0);

      const result = await service.validate('SAVE10', 1000, 1);

      expect(result.success).toBe(true);
      expect(result.coupon.calculatedDiscount).toBe(100); // 10% of 1000
    });

    it('should validate a valid fixed amount coupon', async () => {
      prisma.coupon.findUnique.mockResolvedValue(fixedCoupon);
      prisma.couponUsage.count.mockResolvedValue(0);

      const result = await service.validate('FLAT100', 500, 1);

      expect(result.success).toBe(true);
      expect(result.coupon.calculatedDiscount).toBe(100);
    });

    it('should cap percentage discount at maxDiscount', async () => {
      prisma.coupon.findUnique.mockResolvedValue(percentageCoupon);
      prisma.couponUsage.count.mockResolvedValue(0);

      const result = await service.validate('SAVE10', 5000, 1);

      expect(result.coupon.calculatedDiscount).toBe(200); // capped at maxDiscount
    });

    it('should not exceed subtotal', async () => {
      const lowMinCoupon = { ...fixedCoupon, minPurchase: 0 };
      prisma.coupon.findUnique.mockResolvedValue(lowMinCoupon);
      prisma.couponUsage.count.mockResolvedValue(0);

      const result = await service.validate('FLAT100', 50, 1);

      expect(result.coupon.calculatedDiscount).toBe(50); // min(100, 50)
    });

    it('should throw NotFoundException for non-existent coupon', async () => {
      prisma.coupon.findUnique.mockResolvedValue(null);

      await expect(service.validate('NONE', 1000, 1)).rejects.toThrow(NotFoundException);
    });

    it('should throw for inactive coupon', async () => {
      prisma.coupon.findUnique.mockResolvedValue(inactiveCoupon);

      await expect(service.validate('INACTIVE', 1000, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw for expired coupon', async () => {
      prisma.coupon.findUnique.mockResolvedValue(expiredCoupon);

      await expect(service.validate('EXPIRED', 1000, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw when below minimum purchase', async () => {
      prisma.coupon.findUnique.mockResolvedValue(percentageCoupon);

      await expect(service.validate('SAVE10', 100, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw when usage limit reached', async () => {
      const fullCoupon = { ...percentageCoupon, usedCount: 100 };
      prisma.coupon.findUnique.mockResolvedValue(fullCoupon);

      await expect(service.validate('SAVE10', 1000, 1)).rejects.toThrow(BadRequestException);
    });

    it('should throw when per-user limit reached', async () => {
      prisma.coupon.findUnique.mockResolvedValue(percentageCoupon);
      prisma.couponUsage.count.mockResolvedValue(1);

      await expect(service.validate('SAVE10', 1000, 1)).rejects.toThrow(BadRequestException);
    });
  });

  describe('apply', () => {
    it('should apply coupon and create usage record', async () => {
      prisma.coupon.findUnique.mockResolvedValue(percentageCoupon);
      prisma.couponUsage.count.mockResolvedValue(0);
      prisma.$transaction.mockImplementation(async (fn: any) => {
        return fn({
          coupon: { update: jest.fn() },
          couponUsage: { create: jest.fn() },
        });
      });

      const result = await service.apply('SAVE10', 1, 'checkout-123');

      expect(result.success).toBe(true);
    });
  });

  describe('releaseCoupon', () => {
    it('should release unused coupon and decrement count', async () => {
      prisma.coupon.findUnique.mockResolvedValue(percentageCoupon);
      prisma.couponUsage.findFirst.mockResolvedValue({ id: 1, couponId: 1, userId: 1, orderId: null });
      prisma.$transaction.mockImplementation(async (fn: any) => {
        return fn({
          couponUsage: { delete: jest.fn() },
          coupon: { update: jest.fn() },
        });
      });

      await service.releaseCoupon('SAVE10', 1);

      expect(prisma.$transaction).toHaveBeenCalled();
    });

    it('should do nothing if coupon not found', async () => {
      prisma.coupon.findUnique.mockResolvedValue(null);

      await service.releaseCoupon('NONE', 1);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  describe('create', () => {
    it('should create a new coupon', async () => {
      prisma.coupon.findUnique.mockResolvedValue(null);
      prisma.coupon.create.mockResolvedValue(percentageCoupon);

      const result = await service.create({
        code: 'SAVE10',
        type: 'PERCENTAGE',
        discount: 10,
        minPurchase: 500,
        maxDiscount: 200,
        expiresAt: futureDate.toISOString(),
      });

      expect(result.code).toBe('SAVE10');
      expect(auditService.log).toHaveBeenCalled();
    });

    it('should throw if coupon code already exists', async () => {
      prisma.coupon.findUnique.mockResolvedValue(percentageCoupon);

      await expect(service.create({
        code: 'SAVE10',
        type: 'PERCENTAGE',
        discount: 10,
        expiresAt: futureDate.toISOString(),
      })).rejects.toThrow(BadRequestException);
    });

    it('should throw if percentage exceeds 100', async () => {
      prisma.coupon.findUnique.mockResolvedValue(null);

      await expect(service.create({
        code: 'BAD',
        type: 'PERCENTAGE',
        discount: 150,
        expiresAt: futureDate.toISOString(),
      })).rejects.toThrow(BadRequestException);
    });
  });
});
