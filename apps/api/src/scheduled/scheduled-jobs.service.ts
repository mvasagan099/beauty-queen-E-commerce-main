import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../common/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AlertsService } from '../alerts/alerts.service';

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Daily scheduled jobs.
 *
 * Both the API and the worker boot AppModule and register the same @Cron
 * hooks, so every job runs under a distributed Redis lock — exactly one
 * process executes the run and the other no-ops. BullMQ's deterministic
 * eventIds provide a second layer of idempotency for the emails themselves.
 */
@Injectable()
export class ScheduledJobsService {
  private readonly logger = new Logger(ScheduledJobsService.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private notifications: NotificationsService,
    private alerts: AlertsService,
  ) {}

  /**
   * Abandoned-cart reminders. Eligibility (all must hold):
   *  - the shopper opted in to promotional email
   *  - the cart was last touched 24-72h ago (fresh enough to matter, but no
   *    longer so the shopper isn't spammed on an actively-used cart)
   *  - no reminder was sent to them in the last 7 days
   *  - the cart still contains at least one in-stock, non-deleted product
   */
  @Cron('30 2 * * *')
  async processAbandonedCarts(): Promise<void> {
    try {
      await this.redis.withLock('abandoned-carts', 60 * 29, async () => {
        const now = Date.now();

        const groups = await this.prisma.cartItem.groupBy({
          by: ['userId'],
          _min: { updatedAt: true },
          _max: { updatedAt: true },
        });

        const candidates = groups.filter((g) => {
          const lastActivity = g._max.updatedAt ? g._max.updatedAt.getTime() : null;
          return lastActivity != null && lastActivity >= now - 3 * DAY_MS && lastActivity <= now - DAY_MS;
        });

        let sent = 0;
        for (const group of candidates) {
          try {
            const userId = group.userId;

            if (!(await this.notifications.hasPromotionalConsent(userId))) {
              continue;
            }

            const lastEmail = await this.prisma.abandonedCartEmail.findFirst({
              where: { userId },
              orderBy: { sentAt: 'desc' },
              select: { sentAt: true },
            });
            if (lastEmail && now - lastEmail.sentAt.getTime() < 7 * DAY_MS) {
              continue;
            }

            const items = await this.prisma.cartItem.findMany({
              where: { userId },
              include: { product: true },
              orderBy: { updatedAt: 'desc' },
            });

            const sellable = items.filter(
              (item) => item.product && !item.product.deletedAt && this.alerts.hasStock(item.product),
            );
            if (sellable.length === 0) {
              continue;
            }

            const user = await this.prisma.user.findUnique({ where: { id: userId } });
            if (!user) {
              continue;
            }

            const total = sellable.reduce((sum, item) => sum + (item.product.price || 0) * item.quantity, 0);
            const cartUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/cart`;

            const log = await this.prisma.abandonedCartEmail.create({ data: { userId } });

            await this.notifications.notifyCartReminder(
              {
                userId,
                email: user.email,
                username: user.name || 'there',
                items: sellable.map((item) => ({
                  productName: item.product.name || 'Product',
                  image: item.product.image,
                  price: item.product.price || 0,
                  quantity: item.quantity,
                  size: item.size,
                })),
                total,
                cartUrl,
              },
              log.id,
            );

            sent++;
          } catch (err: any) {
            this.logger.warn(`Failed to process abandoned cart for user ${group.userId}: ${err.message}`);
          }
        }

        if (sent > 0) {
          this.logger.log(`Abandoned-cart run: ${sent} reminders queued from ${candidates.length} candidate carts`);
        }
      });
    } catch (err: any) {
      this.logger.error(`Abandoned-cart job failed: ${err.message}`);
    }
  }

  /** Deactivate coupons that have expired; idempotent because only active rows change. */
  @Cron('30 0 * * *')
  async deactivateExpiredCoupons(): Promise<void> {
    try {
      await this.redis.withLock('expired-coupons', 60 * 29, async () => {
        const now = new Date();
        const result = await this.prisma.coupon.updateMany({
          where: { active: true, expiresAt: { lt: now } },
          data: { active: false },
        });

        if (result.count > 0) {
          this.logger.log(`Deactivated ${result.count} expired coupon(s)`);
        }
      });
    } catch (err: any) {
      this.logger.error(`Expired-coupons job failed: ${err.message}`);
    }
  }
}