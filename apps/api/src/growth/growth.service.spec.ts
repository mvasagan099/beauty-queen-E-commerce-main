import { BadRequestException } from '@nestjs/common';
import { GrowthService } from './growth.service';

describe('GrowthService', () => {
  let service: GrowthService;
  let configStore: Map<string, any>;
  let prisma: any;

  beforeEach(() => {
    configStore = new Map();
    prisma = {
      siteConfig: {
        findUnique: jest.fn(async ({ where }: any) => {
          const val = configStore.get(where.key);
          return val !== undefined ? { key: where.key, value: val } : null;
        }),
        upsert: jest.fn(async ({ where, update }: any) => {
          configStore.set(where.key, update.value);
          return { key: where.key, value: update.value };
        }),
      },
      order: {
        findMany: jest.fn(async () => []),
      },
      product: {
        findMany: jest.fn(async () => []),
      },
      $transaction: jest.fn(async (ops: Promise<any>[]) => Promise.all(ops)),
    };
    service = new GrowthService(prisma);
  });

  it('updates and retrieves merchandising flash-sale banners', async () => {
    const saved = await service.updateBanner({
      active: true,
      headline: 'Diwali Silk Extravaganza',
      couponCode: 'diwali15',
    });

    expect(saved.active).toBe(true);
    expect(saved.couponCode).toBe('DIWALI15');

    const loaded = await service.getBanner();
    expect(loaded.headline).toBe('Diwali Silk Extravaganza');
  });

  it('computes Queen’s Circle tiers and enforces referral redemption rules', async () => {
    prisma.order.findMany.mockResolvedValue([{ totalAmount: 6500 }]);
    const summary = await service.getLoyaltySummary(7);

    expect(summary.tier).toBe('Gold');
    expect(summary.points).toBe(650);
    expect(summary.nextTier).toBe('Royal Zari');
    expect(summary.spendToNextTier).toBe(8500);

    // Cannot self-refer
    await expect(service.applyReferralCode(7, summary.referralCode)).rejects.toThrow(
      BadRequestException,
    );

    // Valid friend referral awards +200 points to both
    const friendCode = service.buildReferralCode(9);
    const res = await service.applyReferralCode(7, friendCode);
    expect(res.success).toBe(true);
    expect(res.bonusPoints).toBe(200);

    // Second redemption rejected
    await expect(service.applyReferralCode(7, service.buildReferralCode(10))).rejects.toThrow(
      BadRequestException,
    );
  });

  it('parses natural-language stylist prompt into category + budget filter', async () => {
    prisma.product.findMany.mockResolvedValue([
      { id: 1, name: 'Kanjeevaram Silk Saree', price: 4500, mrp: 6000, image: null, ptype: 'saree' },
    ]);

    const res = await service.getStylistRecommendations('Festive wedding silk saree under ₹5,000');

    expect(res.intent).toEqual({ category: 'saree', maxPrice: 5000 });
    expect(res.recommendations).toHaveLength(1);
    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          ptype: 'saree',
          price: { lte: 5000 },
        }),
      }),
    );
  });
});
