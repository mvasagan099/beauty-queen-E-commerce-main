import { Test, TestingModule } from '@nestjs/testing';
import { PricingService } from './pricing.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('PricingService', () => {
  let service: PricingService;
  let prisma: Record<string, any>;

  const mockProduct = {
    id: 1,
    name: 'Test Saree',
    price: 999,
    mrp: 1499,
    deletedAt: null,
  };

  const mockCoupon = {
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
    expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    active: true,
  };

  beforeEach(async () => {
    prisma = {
      product: {
        findFirst: jest.fn(),
      },
      coupon: {
        findUnique: jest.fn(),
      },
      couponUsage: {
        count: jest.fn(),
      },
      siteConfig: {
        findUnique: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PricingService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<PricingService>(PricingService);
  });

  describe('calculatePricing', () => {
    it('should calculate basic pricing without coupon', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.siteConfig.findUnique.mockResolvedValue(null);

      const result = await service.calculatePricing({
        items: [{ productId: 1, size: 'M', quantity: 2 }],
      });

      expect(result.subtotal).toBe(1998); // 999 * 2
      expect(result.productDiscount).toBe(1000); // (1499 - 999) * 2
      expect(result.couponDiscount).toBe(0);
      expect(result.total).toBe(1998);
    });

    it('should apply coupon discount', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.coupon.findUnique.mockResolvedValue(mockCoupon);
      prisma.couponUsage.count.mockResolvedValue(0);
      prisma.siteConfig.findUnique.mockResolvedValue(null);

      const result = await service.calculatePricing({
        items: [{ productId: 1, size: 'M', quantity: 2 }],
        couponCode: 'SAVE10',
      });

      expect(result.couponDiscount).toBe(200); // 10% of 1998, rounded
      expect(result.total).toBe(1798); // 1998 - 200
    });

    it('should apply fixed amount coupon', async () => {
      const fixedCoupon = { ...mockCoupon, type: 'FIXED_AMOUNT', discount: 100, maxDiscount: null };
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.coupon.findUnique.mockResolvedValue(fixedCoupon);
      prisma.couponUsage.count.mockResolvedValue(0);
      prisma.siteConfig.findUnique.mockResolvedValue(null);

      const result = await service.calculatePricing({
        items: [{ productId: 1, size: 'M', quantity: 2 }],
        couponCode: 'FLAT100',
      });

      expect(result.couponDiscount).toBe(100);
      expect(result.total).toBe(1898); // 1998 - 100
    });

    it('should cap coupon at maxDiscount', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.coupon.findUnique.mockResolvedValue(mockCoupon); // maxDiscount: 200
      prisma.couponUsage.count.mockResolvedValue(0);
      prisma.siteConfig.findUnique.mockResolvedValue(null);

      const result = await service.calculatePricing({
        items: [{ productId: 1, size: 'M', quantity: 5 }],
        couponCode: 'SAVE10',
      });

      // 5 * 999 = 4995, 10% = 499.5 -> capped at 200
      expect(result.couponDiscount).toBe(200);
    });

    it('should calculate shipping from config', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.siteConfig.findUnique.mockImplementation(async ({ where }: any) => {
        if (where.key === 'shipping') {
          return { key: 'shipping', value: { freeShippingThreshold: 2000, baseCharge: 99 } };
        }
        return null;
      });

      const result = await service.calculatePricing({
        items: [{ productId: 1, size: 'M', quantity: 1 }],
      });

      // subtotal = 999, below freeShippingThreshold (2000)
      expect(result.shipping).toBe(99);
    });

    it('should offer free shipping above threshold', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.siteConfig.findUnique.mockImplementation(async ({ where }: any) => {
        if (where.key === 'shipping') {
          return { key: 'shipping', value: { freeShippingThreshold: 2000, baseCharge: 99 } };
        }
        return null;
      });

      const result = await service.calculatePricing({
        items: [{ productId: 1, size: 'M', quantity: 3 }],
      });

      // subtotal = 2997, above freeShippingThreshold (2000)
      expect(result.shipping).toBe(0);
    });

    it('should calculate tax from config', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.siteConfig.findUnique.mockImplementation(async ({ where }: any) => {
        if (where.key === 'tax') {
          return { key: 'tax', value: { gstRate: 18 } };
        }
        return null;
      });

      const result = await service.calculatePricing({
        items: [{ productId: 1, size: 'M', quantity: 1 }],
      });

      // 18% of 999 = 179.82 -> rounded to 180
      expect(result.tax).toBe(180);
    });

    it('should throw for non-existent product', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.calculatePricing({
          items: [{ productId: 999, size: 'M', quantity: 1 }],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw for invalid coupon', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.coupon.findUnique.mockResolvedValue(null);

      await expect(
        service.calculatePricing({
          items: [{ productId: 1, size: 'M', quantity: 1 }],
          couponCode: 'INVALID',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('calculateCouponDiscount', () => {
    it('should calculate percentage discount correctly', async () => {
      prisma.coupon.findUnique.mockResolvedValue(mockCoupon);
      prisma.couponUsage.count.mockResolvedValue(0);

      const result = await service.calculateCouponDiscount('SAVE10', 1000, 1);

      expect(result.calculatedDiscount).toBe(100);
      expect(result.type).toBe('PERCENTAGE');
    });

    it('should throw for expired coupon', async () => {
      const expired = { ...mockCoupon, expiresAt: new Date(Date.now() - 86400000) };
      prisma.coupon.findUnique.mockResolvedValue(expired);

      await expect(service.calculateCouponDiscount('SAVE10', 1000, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw for inactive coupon', async () => {
      prisma.coupon.findUnique.mockResolvedValue({ ...mockCoupon, active: false });

      await expect(service.calculateCouponDiscount('SAVE10', 1000, 1)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw for coupon below minimum purchase', async () => {
      prisma.coupon.findUnique.mockResolvedValue(mockCoupon);

      await expect(service.calculateCouponDiscount('SAVE10', 100, 1)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
