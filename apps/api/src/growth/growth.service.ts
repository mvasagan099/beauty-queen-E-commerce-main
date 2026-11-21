import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import * as crypto from 'crypto';
import { PrismaService } from '../prisma/prisma.service';

export interface FlashSaleBanner {
  active: boolean;
  headline: string;
  subtext: string;
  couponCode: string;
  ctaLabel: string;
  ctaHref: string;
  endsAt: string | null;
}

export interface LoyaltySummary {
  tier: 'Rose' | 'Gold' | 'Royal Zari';
  points: number;
  lifetimeSpend: number;
  nextTier: string | null;
  spendToNextTier: number;
  referralCode: string;
  referralsClaimed: number;
  appliedReferralCode: string | null;
}

const BANNER_CONFIG_KEY = 'merchandising_banner';

const DEFAULT_BANNER: FlashSaleBanner = {
  active: false,
  headline: 'Festive Zari Silk Edit — Flat 10% Off',
  subtext: 'Enjoy complimentary shipping across India on orders above ₹999',
  couponCode: 'QUEEN10',
  ctaLabel: 'Shop Sarees',
  ctaHref: '/saree',
  endsAt: null,
};

@Injectable()
export class GrowthService {
  private readonly logger = new Logger(GrowthService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Merchandising Flash-Sale Banner CMS ───────────────────────

  async getBanner(): Promise<FlashSaleBanner> {
    try {
      const cfg = await this.prisma.siteConfig.findUnique({
        where: { key: BANNER_CONFIG_KEY },
      });
      if (cfg?.value && typeof cfg.value === 'object') {
        return { ...DEFAULT_BANNER, ...(cfg.value as Partial<FlashSaleBanner>) };
      }
    } catch {
      // Fallback cleanly to default banner
    }
    return DEFAULT_BANNER;
  }

  async updateBanner(patch: Partial<FlashSaleBanner>): Promise<FlashSaleBanner> {
    const current = await this.getBanner();
    const updated: FlashSaleBanner = {
      active: patch.active !== undefined ? Boolean(patch.active) : current.active,
      headline: (patch.headline ?? current.headline).trim().slice(0, 140),
      subtext: (patch.subtext ?? current.subtext).trim().slice(0, 220),
      couponCode: (patch.couponCode ?? current.couponCode).trim().toUpperCase().slice(0, 32),
      ctaLabel: (patch.ctaLabel ?? current.ctaLabel).trim().slice(0, 40) || 'Shop Now',
      ctaHref: (patch.ctaHref ?? current.ctaHref).trim().slice(0, 120) || '/saree',
      endsAt: patch.endsAt === '' ? null : patch.endsAt ?? current.endsAt,
    };

    await this.prisma.siteConfig.upsert({
      where: { key: BANNER_CONFIG_KEY },
      update: { value: updated as any },
      create: { key: BANNER_CONFIG_KEY, value: updated as any },
    });

    this.logger.log(`Updated merchandising banner (active=${updated.active})`);
    return updated;
  }

  // ─── Queen's Circle Loyalty & Referrals ────────────────────────

  buildReferralCode(userId: number): string {
    const hash = crypto
      .createHash('sha256')
      .update(`bq-ref-${userId}`)
      .digest('hex')
      .slice(0, 4)
      .toUpperCase();
    return `BQ${userId}${hash}`;
  }

  async getLoyaltySummary(userId: number): Promise<LoyaltySummary> {
    const orders = await this.prisma.order.findMany({
      where: {
        userId,
        status: { not: 'Cancelled' },
      },
      select: { totalAmount: true, subtotal: true },
    });

    const lifetimeSpend = orders.reduce(
      (sum, o) => sum + (Number(o.totalAmount) || Number(o.subtotal) || 0),
      0,
    );

    const cfgKey = `loyalty:user:${userId}`;
    const stored = await this.prisma.siteConfig
      .findUnique({ where: { key: cfgKey } })
      .catch(() => null);
    const meta = (stored?.value as {
      bonusPoints?: number;
      referralsClaimed?: number;
      appliedReferralCode?: string | null;
    }) || {};

    const orderPoints = Math.floor(lifetimeSpend / 10);
    const points = orderPoints + Number(meta.bonusPoints || 0);

    let tier: LoyaltySummary['tier'] = 'Rose';
    let nextTier: string | null = 'Gold';
    let spendToNextTier = Math.max(0, 5000 - lifetimeSpend);

    if (lifetimeSpend >= 15000) {
      tier = 'Royal Zari';
      nextTier = null;
      spendToNextTier = 0;
    } else if (lifetimeSpend >= 5000) {
      tier = 'Gold';
      nextTier = 'Royal Zari';
      spendToNextTier = Math.max(0, 15000 - lifetimeSpend);
    }

    return {
      tier,
      points,
      lifetimeSpend,
      nextTier,
      spendToNextTier,
      referralCode: this.buildReferralCode(userId),
      referralsClaimed: Number(meta.referralsClaimed || 0),
      appliedReferralCode: meta.appliedReferralCode || null,
    };
  }

  async applyReferralCode(userId: number, rawCode: string) {
    const code = (rawCode || '').trim().toUpperCase();
    if (!/^BQ\d+[A-F0-9]{4}$/.test(code)) {
      throw new BadRequestException('Invalid referral code format');
    }

    const myCode = this.buildReferralCode(userId);
    if (code === myCode) {
      throw new BadRequestException('You cannot apply your own referral code');
    }

    const cfgKey = `loyalty:user:${userId}`;
    const stored = await this.prisma.siteConfig.findUnique({ where: { key: cfgKey } });
    const meta = (stored?.value as any) || {};
    if (meta.appliedReferralCode) {
      throw new BadRequestException('You have already redeemed a referral welcome bonus');
    }

    const referrerId = Number(code.slice(2, -4));
    if (!Number.isInteger(referrerId) || referrerId <= 0) {
      throw new BadRequestException('Referral code is not valid');
    }

    const expectedReferrerCode = this.buildReferralCode(referrerId);
    if (expectedReferrerCode !== code) {
      throw new BadRequestException('Referral code could not be verified');
    }

    const updatedUserMeta = {
      ...meta,
      bonusPoints: Number(meta.bonusPoints || 0) + 200,
      appliedReferralCode: code,
    };

    const referrerKey = `loyalty:user:${referrerId}`;
    const referrerStored = await this.prisma.siteConfig.findUnique({
      where: { key: referrerKey },
    });
    const refMeta = (referrerStored?.value as any) || {};
    const updatedRefMeta = {
      ...refMeta,
      bonusPoints: Number(refMeta.bonusPoints || 0) + 200,
      referralsClaimed: Number(refMeta.referralsClaimed || 0) + 1,
    };

    await this.prisma.$transaction([
      this.prisma.siteConfig.upsert({
        where: { key: cfgKey },
        update: { value: updatedUserMeta },
        create: { key: cfgKey, value: updatedUserMeta },
      }),
      this.prisma.siteConfig.upsert({
        where: { key: referrerKey },
        update: { value: updatedRefMeta },
        create: { key: referrerKey, value: updatedRefMeta },
      }),
    ]);

    return {
      success: true,
      message: 'Referral applied! 200 Queen’s Circle points added to your balance.',
      bonusPoints: 200,
    };
  }

  // ─── Smart Fashion & Beauty Stylist ────────────────────────────

  async getStylistRecommendations(rawPrompt: string) {
    const prompt = (rawPrompt || '').trim();
    if (!prompt) {
      throw new BadRequestException('Tell our stylist what occasion, style, or budget you have in mind');
    }

    const lower = prompt.toLowerCase();

    // Parse category intent
    let detectedCategory: string | undefined;
    if (/\b(saree|sari|silk|kanjeevaram|wedding|bridal|drape)\b/.test(lower)) {
      detectedCategory = 'saree';
    } else if (/\b(kurthi|kurti|tunic|anarkali|ethnic|office)\b/.test(lower)) {
      detectedCategory = 'kurthi';
    } else if (/\b(cosmetic|lipstick|lip|kajal|serum|makeup|glow|skincare|beauty)\b/.test(lower)) {
      detectedCategory = 'cosmetics';
    } else if (/\b(top|blouse|shirt|satin)\b/.test(lower)) {
      detectedCategory = 'top';
    } else if (/\b(leggin|leggings|churidar|bottom|stretch)\b/.test(lower)) {
      detectedCategory = 'leggin';
    }

    // Parse budget ceiling ("under 3000", "below ₹2,500", "max 1500")
    const budgetMatch = lower.match(/(?:under|below|less than|max|within|upto|up to)\s*₹?\s*([\d,]+)/);
    const maxPrice = budgetMatch ? Number(budgetMatch[1].replace(/,/g, '')) : undefined;

    const where: any = {
      deletedAt: null,
      OR: [
        { sizeS: { gt: 0 } },
        { sizeM: { gt: 0 } },
        { sizeL: { gt: 0 } },
        { sizeXl: { gt: 0 } },
        { sizeXxl: { gt: 0 } },
        { quantity: { gt: 0 } },
      ],
    };

    if (detectedCategory) {
      where.ptype = detectedCategory;
    }
    if (maxPrice && Number.isFinite(maxPrice) && maxPrice > 0) {
      where.price = { lte: maxPrice };
    }

    const products = await this.prisma.product.findMany({
      where,
      orderBy: maxPrice ? { price: 'desc' } : { id: 'desc' },
      take: 6,
      select: {
        id: true,
        name: true,
        price: true,
        mrp: true,
        image: true,
        ptype: true,
      },
    });

    const adviceParts: string[] = [];
    if (detectedCategory === 'saree') {
      adviceParts.push('Pair rich zari borders with temple gold earrings and a matte kumkum-rose lip.');
    } else if (detectedCategory === 'kurthi') {
      adviceParts.push('Style breathable embroidered kurthis with jewel-tone modal leggings and subtle kajal.');
    } else if (detectedCategory === 'cosmetics') {
      adviceParts.push('Prep with botanical gold serum before applying velvet-matte lip pigments for all-day wear.');
    } else {
      adviceParts.push('Mix festive drapes with breathable everyday silhouettes tailored for Indian weather.');
    }
    if (maxPrice) {
      adviceParts.push(`Filtered within your ₹${maxPrice.toLocaleString('en-IN')} budget.`);
    }

    return {
      success: true,
      intent: {
        category: detectedCategory || 'all',
        maxPrice: maxPrice ?? null,
      },
      stylistNote: adviceParts.join(' '),
      recommendations: products,
    };
  }
}
