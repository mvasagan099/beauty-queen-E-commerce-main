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
        deleteMany: jest.fn(async ({ where }: any) => {
          configStore.delete(where.key);
          return { count: 1 };
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

  it('caps Queen’s Circle points redemption at 15% of subtotal and deducts idempotently', async () => {
    // 20,000 spend => 2,000 points (= ₹200 max from points), subtotal ₹1,000 => 15% cap = ₹150 (1,500 pts)
    prisma.order.findMany.mockResolvedValue([{ totalAmount: 20000, subtotal: 20000 }]);

    const preview = await service.previewPointsRedemption(12, 1000);
    expect(preview.availablePoints).toBe(2000);
    expect(preview.discountInr).toBe(150);
    expect(preview.redeemablePoints).toBe(1500);

    const redeemed = await service.redeemPointsForCheckout(12, 1000, 'chk-abc');
    expect(redeemed).toEqual({ pointsRedeemed: 1500, discountInr: 150 });

    // Remaining points after redemption should be 500
    const after = await service.getLoyaltySummary(12);
    expect(after.points).toBe(500);

    // Duplicate redemption for same checkoutId is idempotent no-op
    const dup = await service.redeemPointsForCheckout(12, 1000, 'chk-abc');
    expect(dup).toEqual({ pointsRedeemed: 0, discountInr: 0 });
  });

  it('returns curated category default swatches and persists custom seller swatches', async () => {
    const cosmeticsDefaults = await service.getProductSwatches(99, 'Cosmetics');
    expect(cosmeticsDefaults.length).toBeGreaterThanOrEqual(4);
    expect(cosmeticsDefaults[0].hex).toMatch(/^#[0-9A-F]{6}$/i);

    const saved = await service.saveProductSwatches(99, [
      { id: 'ruby', name: 'Madras Ruby', hex: '#A81C44', image: '/uploads/ruby.webp' },
    ]);
    expect(saved).toHaveLength(1);
    const loaded = await service.getProductSwatches(99, 'Cosmetics');
    expect(loaded[0].name).toBe('Madras Ruby');
  });

  it('validates, deduplicates, and removes Expo native push tokens', async () => {
    await expect(
      service.saveExpoPushToken(42, { token: 'invalid-token', platform: 'android' }),
    ).rejects.toThrow(BadRequestException);

    const first = await service.saveExpoPushToken(42, {
      token: 'ExponentPushToken[abc123XYZ]',
      platform: 'android',
      deviceName: 'Pixel 9',
    });
    expect(first).toEqual({ success: true, registered: true, deviceCount: 1 });

    // Re-registering same token deduplicates
    const duplicate = await service.saveExpoPushToken(42, {
      token: 'ExponentPushToken[abc123XYZ]',
      platform: 'android',
    });
    expect(duplicate.deviceCount).toBe(1);

    const removed = await service.removeExpoPushToken(42, 'ExponentPushToken[abc123XYZ]');
    expect(removed).toEqual({ success: true, registered: false, deviceCount: 0 });
  });
});
