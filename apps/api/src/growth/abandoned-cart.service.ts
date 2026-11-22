import { Injectable, Logger, Optional } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../common/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { WhatsAppService } from '../notifications/whatsapp.service';
import {
  EmailEventType,
  InAppNotificationType,
} from '../notifications/types/notification.types';

export interface AbandonedCartSweepResult {
  scannedCarts: number;
  remindedCount: number;
  skippedRecentOrder: number;
  skippedAlreadyReminded: number;
  whatsappDispatched: number;
}

const REMINDER_DEDUPE_TTL_SECONDS = 24 * 60 * 60; // 24 hours

@Injectable()
export class AbandonedCartService {
  private readonly logger = new Logger(AbandonedCartService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    @Optional() private readonly notifications?: NotificationsService,
    @Optional() private readonly whatsapp?: WhatsAppService,
  ) {}

  private dedupeKey(userId: number): string {
    return `abandoned_cart:reminded:${userId}`;
  }

  async getStats(minIdleMinutes = 120) {
    const cutoff = new Date(Date.now() - Math.max(15, minIdleMinutes) * 60 * 1000);
    const items = await this.prisma.cartItem.findMany({
      where: { updatedAt: { lte: cutoff } },
      include: { product: { select: { price: true } } },
    });

    const byUser = new Map<number, number>();
    for (const item of items) {
      const value = Number(item.product?.price || 0) * item.quantity;
      byUser.set(item.userId, (byUser.get(item.userId) || 0) + value);
    }

    let totalAbandonedValue = 0;
    for (const v of byUser.values()) totalAbandonedValue += v;

    return {
      eligibleCarts: byUser.size,
      totalAbandonedValue,
      minIdleMinutes,
    };
  }

  async runRecoverySweep(minIdleMinutes = 120): Promise<AbandonedCartSweepResult> {
    const cutoff = new Date(Date.now() - Math.max(15, minIdleMinutes) * 60 * 1000);
    const recentOrderCutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const idleItems = await this.prisma.cartItem.findMany({
      where: { updatedAt: { lte: cutoff } },
      include: {
        user: { select: { id: true, email: true, name: true, phone: true } },
        product: { select: { id: true, name: true, price: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    const grouped = new Map<
      number,
      {
        user: { id: number; email: string; name: string | null; phone: string | null };
        itemCount: number;
        totalAmount: number;
        firstProductName: string;
      }
    >();

    for (const item of idleItems) {
      if (!item.user?.email) continue;
      const existing = grouped.get(item.userId);
      const lineValue = Number(item.product?.price || 0) * item.quantity;
      if (!existing) {
        grouped.set(item.userId, {
          user: item.user,
          itemCount: item.quantity,
          totalAmount: lineValue,
          firstProductName: item.product?.name || 'your selected pieces',
        });
      } else {
        existing.itemCount += item.quantity;
        existing.totalAmount += lineValue;
      }
    }

    const result: AbandonedCartSweepResult = {
      scannedCarts: grouped.size,
      remindedCount: 0,
      skippedRecentOrder: 0,
      skippedAlreadyReminded: 0,
      whatsappDispatched: 0,
    };

    const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/+$/, '');
    const cartUrl = `${frontendUrl}/cart`;
    const dateStamp = new Date().toISOString().slice(0, 10);

    for (const [userId, cart] of grouped.entries()) {
      const alreadySent = await this.redis.get(this.dedupeKey(userId));
      if (alreadySent) {
        result.skippedAlreadyReminded += 1;
        continue;
      }

      const recentOrder = await this.prisma.order.findFirst({
        where: {
          userId,
          status: { not: 'Cancelled' },
          orderDate: { gte: recentOrderCutoff },
        },
        select: { id: true },
      });
      if (recentOrder) {
        result.skippedRecentOrder += 1;
        continue;
      }

      // Mark dedupe key first (24h window) to prevent double-sends
      await this.redis.set(this.dedupeKey(userId), '1', REMINDER_DEDUPE_TTL_SECONDS);

      if (this.notifications) {
        await this.notifications.sendEmail(
          EmailEventType.CART_REMINDER,
          cart.user.email,
          {
            username: cart.user.name || 'Beauty Queen Member',
            itemCount: cart.itemCount,
            totalAmount: cart.totalAmount,
            firstProductName: cart.firstProductName,
            cartUrl,
          },
          `cart-reminder:${userId}:${dateStamp}`,
        );

        await this.notifications.createInAppNotification(
          userId,
          InAppNotificationType.PROMOTIONAL,
          'Your Beauty Queen bag is waiting',
          `Complete your order for ${cart.firstProductName}${cart.itemCount > 1 ? ` and ${cart.itemCount - 1} more item(s)` : ''} before stock runs out.`,
          { cartUrl, itemCount: cart.itemCount, totalAmount: cart.totalAmount },
        );
      }

      if (this.whatsapp && cart.user.phone) {
        const waRes = await this.whatsapp.sendTextMessage(
          cart.user.phone,
          `Beauty Queen: ${cart.firstProductName} is still waiting in your bag (₹${cart.totalAmount.toLocaleString('en-IN')}). Complete your order here: ${cartUrl}`,
        );
        if (waRes.sent) {
          result.whatsappDispatched += 1;
        }
      }

      result.remindedCount += 1;
    }

    this.logger.log(
      `Abandoned cart sweep: scanned=${result.scannedCarts}, reminded=${result.remindedCount}, skippedRecentOrder=${result.skippedRecentOrder}, skippedDedupe=${result.skippedAlreadyReminded}`,
    );
    return result;
  }
}
