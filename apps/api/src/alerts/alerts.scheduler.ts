import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../common/redis.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AlertsService } from './alerts.service';
import { StockAlertStatus, PriceAlertStatus } from '@prisma/client';

/**
 * Scheduled alert fulfilment.
 *
 * Both the API and the worker boot AppModule, so every @Cron here is guarded
 * by a distributed Redis lock: only one process performs each run and the
 * other no-ops. BullMQ dedupes email jobs by deterministic eventId as a second
 * layer of idempotency.
 */
@Injectable()
export class AlertsScheduler {
  private readonly logger = new Logger(AlertsScheduler.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    private notifications: NotificationsService,
    private alerts: AlertsService,
  ) {}

  @Cron('0 */15 * * * *')
  async processStockAlerts(): Promise<void> {
    await this.redis.withLock('stock-alerts', 60 * 14, async () => {
      const waiting = await this.prisma.stockAlert.findMany({
        where: { status: StockAlertStatus.WAITING },
        include: { product: true, user: true },
      });

      let triggeredCount = 0;
      for (const alert of waiting) {
        const product = alert.product;
        if (!product || product.deletedAt) {
          continue;
        }

        if (this.alerts.hasStock(product)) {
          await this.prisma.stockAlert.update({
            where: { id: alert.id },
            data: { status: StockAlertStatus.TRIGGERED, notifiedAt: new Date() },
          });

          await this.notifications.notifyBackInStock(
            {
              userId: alert.userId,
              email: alert.email || alert.user.email,
              username: alert.user.name || 'there',
              productId: product.id,
              productName: product.name || 'Product',
              image: product.image,
              size: alert.size,
              price: product.price,
              productUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/product/${product.id}`,
            },
            alert.id,
          );

          triggeredCount++;
          this.logger.log(`Stock alert ${alert.id} triggered for product ${product.id}`);
        }
      }

      if (triggeredCount > 0) {
        this.logger.log(`Stock-alert run: ${triggeredCount} of ${waiting.length} alerts triggered`);
      }
    });
  }

  @Cron('0 */15 * * * *')
  async processPriceAlerts(): Promise<void> {
    await this.redis.withLock('price-alerts', 60 * 14, async () => {
      const watching = await this.prisma.priceAlert.findMany({
        where: { status: PriceAlertStatus.WATCHING },
        include: { product: true, user: true },
      });

      let triggeredCount = 0;
      for (const alert of watching) {
        const product = alert.product;
        if (!product || product.deletedAt) {
          continue;
        }

        if (product.price != null && product.price < alert.watchedPrice) {
          await this.prisma.priceAlert.update({
            where: { id: alert.id },
            data: { status: PriceAlertStatus.TRIGGERED, notifiedAt: new Date() },
          });

          await this.notifications.notifyPriceDrop(
            {
              userId: alert.userId,
              email: alert.user.email,
              username: alert.user.name || 'there',
              productId: product.id,
              productName: product.name || 'Product',
              image: product.image,
              watchedPrice: alert.watchedPrice,
              currentPrice: product.price,
              oldPrice: product.mrp,
              productUrl: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/product/${product.id}`,
            },
            alert.id,
          );

          triggeredCount++;
          this.logger.log(`Price alert ${alert.id} triggered for product ${product.id}`);
        }
      }

      if (triggeredCount > 0) {
        this.logger.log(`Price-alert run: ${triggeredCount} of ${watching.length} alerts triggered`);
      }
    });
  }
}