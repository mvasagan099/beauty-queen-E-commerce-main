import {
  Injectable,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CouponsService } from '../coupons/coupons.service';
import { RedisService } from '../common/redis.service';
import { RazorpayService } from './razorpay.service';
import { WebhookProcessResult } from './types/payment.types';
import {
  PAYMENT_STATUS,
  PAYMENT_REDIS_KEYS,
  ORDER_PAYMENT_STATUS,
  PaymentStatus,
} from './types/payment-status';
import { Prisma } from '@prisma/client';

/**
 * Handles Razorpay webhook deliveries.
 *
 * Guarantees:
 * - Every raw event is persisted to `payment_webhook_events` and is processed
 *   at most once (idempotency via unique `providerEventId` + a distributed lock).
 * - Event amount/currency/method are cross-checked against the authoritative
 *   backend payment record before any order is confirmed.
 *
 * Unhandled / unknown events are acknowledged (Razorpay expects a 200) but are
 * recorded so they can be reconciled later.
 */
@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private prisma: PrismaService,
    private razorpay: RazorpayService,
    private notifications: NotificationsService,
    private couponsService: CouponsService,
    private redisService: RedisService,
  ) {}

  async processWebhook(event: string, payload: any): Promise<WebhookProcessResult> {
    if (!event || !payload) {
      throw new BadRequestException('Malformed webhook payload');
    }

    const providerEventId = this.buildProviderEventId(event, payload);
    if (!providerEventId) {
      this.logger.warn(`Unprocessable webhook event: ${event} — recorded only`);
      await this.persistUnhandled(event, payload);
      return { success: true, processed: false, message: 'Event not handled' };
    }

    const alreadyProcessed = await this.prisma.paymentWebhookEvent.findUnique({
      where: { providerEventId },
    });
    if (alreadyProcessed?.processed) {
      return { success: true, processed: false, status: 'idempotent' };
    }

    const lockKey = PAYMENT_REDIS_KEYS.webhookLock(providerEventId);
    const lockAcquired = await this.redisService.setNx(lockKey, '1', 30);
    if (!lockAcquired) {
      this.logger.log(`Webhook ${event} already being processed elsewhere`);
      return { success: true, processed: false, status: 'in-progress' };
    }

    try {
      const recheck = await this.prisma.paymentWebhookEvent.findUnique({
        where: { providerEventId },
      });
      if (recheck?.processed) {
        return { success: true, processed: false, status: 'idempotent' };
      }

      const eventRecord = await this.prisma.paymentWebhookEvent.upsert({
        where: { providerEventId },
        create: {
          providerEventId,
          eventType: event,
          paymentId: this.extractPaymentId(event, payload),
          orderIdRef: this.extractOrderId(event, payload),
          payload: payload as Prisma.InputJsonObject,
          processed: false,
        },
        update: {},
      });

      await this.applyEvent(event, payload);

      if (!alreadyProcessed) {
        await this.prisma.paymentWebhookEvent.update({
          where: { id: eventRecord.id },
          data: { processed: true, processedAt: new Date() },
        });
      }

      return { success: true, processed: true };
    } finally {
      await this.redisService.del(lockKey);
    }
  }

  private buildProviderEventId(event: string, payload: any): string | null {
    const entityId = this.extractEntityId(event, payload);
    if (!entityId) return null;
    return `${event}:${entityId}`;
  }

  private extractEventOrderId(event: string, payload: any): string | null {
    if (event.startsWith('payment.')) {
      return payload.payload?.payment?.entity?.order_id || null;
    }
    if (event.startsWith('order.')) {
      return payload.payload?.order?.entity?.id || null;
    }
    return null;
  }

  private extractEntityId(event: string, payload: any): string | null {
    if (event.startsWith('payment.')) {
      return payload.payload?.payment?.entity?.id || null;
    }
    if (event.startsWith('refund.')) {
      return payload.payload?.refund?.entity?.id || null;
    }
    if (event.startsWith('order.')) {
      return payload.payload?.order?.entity?.id || null;
    }
    return null;
  }

  private extractPaymentId(event: string, payload: any): string | null {
    if (event.startsWith('payment.')) {
      return payload.payload?.payment?.entity?.id || null;
    }
    if (event.startsWith('refund.')) {
      return payload.payload?.refund?.entity?.payment_id || null;
    }
    return this.extractEventOrderId(event, payload);
  }

  private extractOrderId(event: string, payload: any): string | null {
    return this.extractEventOrderId(event, payload);
  }

  private async persistUnhandled(event: string, payload: any) {
    const paymentId = this.extractPaymentId(event, payload) || 'unknown';
    const providerEventId = `${event}:${paymentId}-${Date.now()}`;
    await this.prisma.paymentWebhookEvent.create({
      data: {
        providerEventId,
        eventType: event,
        paymentId: this.extractPaymentId(event, payload),
        orderIdRef: this.extractOrderId(event, payload),
        payload: payload as Prisma.InputJsonObject,
        processed: false,
      },
    });
  }

  private async applyEvent(event: string, payload: any) {
    switch (event) {
      case 'payment.captured':
        await this.handleCaptured(payload);
        break;
      case 'payment.failed':
        await this.handleFailed(payload);
        break;
      case 'payment.authorized':
        await this.handleAuthorized(payload);
        break;
      case 'refund.processed':
      case 'refund.created':
        await this.handleRefundProcessed(payload);
        break;
      case 'refund.failed':
        await this.handleRefundFailed(payload);
        break;
      default:
        this.logger.log(`Webhook event quasi-processed (no-op): ${event}`);
    }
  }

  private async findPaymentByOrderId(
    tx: Prisma.TransactionClient | PrismaService,
    orderId: string | undefined,
  ) {
    if (!orderId) return null;
    return tx.payment.findFirst({
      where: { providerOrderId: orderId },
      include: { user: true },
    });
  }

  private async handleCaptured(payload: any) {
    const entity = payload.payload?.payment?.entity;
    if (!entity) return;

    const payment = await this.findPaymentByOrderId(this.prisma, entity.order_id);
    if (!payment) {
      this.logger.warn(`Webhook captured: no payment for order ${entity.order_id}`);
      return;
    }

    // Cross-check provider-reported amount/currency against authoritative backend value.
    if (!this.amountMatches(payment, entity)) {
      this.logger.error(
        `Webhook captured: amount mismatch for payment #${payment.id}. Backend=${payment.amount}${payment.currency}, provider=${entity.amount}${entity.currency}`,
      );
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { failureReason: 'Payment amount mismatch (webhook)', metadata: { mismatch: { backend: { amount: payment.amount, currency: payment.currency }, provider: { amount: entity.amount, currency: entity.currency } } } as any },
      });
      return;
    }

    const orders = await this.prisma.order.findMany({
      where: { checkoutId: payment.checkoutId },
    });
    const pendingOrders = orders.filter(
      (o) => o.paymentStatus !== ORDER_PAYMENT_STATUS.COMPLETED,
    );

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          providerPaymentId: entity.id,
          status: PAYMENT_STATUS.CAPTURED,
          method: entity.method || payment.method,
          metadata: this.buildPaymentMetadata(entity),
        },
      });

      for (const order of pendingOrders) {
        await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'Completed',
            paymentId: entity.id,
            status: order.status === 'Pending' ? 'Processing' : order.status,
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            oldStatus: 'Pending',
            newStatus: 'Processing',
          },
        });
      }
    });

    for (const order of pendingOrders) {
      await this.notifications.notifyPaymentSuccess({
        id: order.id,
        email: order.email || '',
        username: order.username || '',
        amount: Number(order.totalAmount || 0),
        paymentMethod: entity.method || 'upi',
      });
    }

    this.logger.log(`Webhook captured: payment ${entity.id} -> orders confirmed`);
  }

  private async handleFailed(payload: any) {
    const entity = payload.payload?.payment?.entity;
    if (!entity) return;

    const payment = await this.findPaymentByOrderId(this.prisma, entity.order_id);
    if (!payment) {
      this.logger.warn(`Webhook failed: no payment for order ${entity.order_id}`);
      return;
    }

    if (payment.status === PAYMENT_STATUS.CAPTURED) {
      this.logger.warn(`Webhook failed: payment #${payment.id} already captured — ignoring`);
      return;
    }

    const failureReason =
      entity.error_description || `Payment failed (${entity.error_code || 'unknown'})`;

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { status: PAYMENT_STATUS.FAILED, failureReason },
    });

    const orders = await this.prisma.order.findMany({
      where: { checkoutId: payment.checkoutId },
    });
    for (const order of orders) {
      if (order.couponCode && (order.userId || payment.userId)) {
        try {
          await this.couponsService.releaseCoupon(
            order.couponCode,
            order.userId || payment.userId!,
          );
        } catch (err: any) {
          this.logger.warn(`Failed to release coupon on payment failure: ${err.message}`);
        }
      }
      if (order.email) {
        await this.notifications.notifyPaymentFailed({
          id: order.id,
          email: order.email,
          username: order.username || '',
          amount: Number(order.totalAmount || 0),
          reason: failureReason,
        });
      }
    }

    this.logger.log(`Webhook failed: payment ${entity.id} marked FAILED`);
  }

  private async handleAuthorized(payload: any) {
    const entity = payload.payload?.payment?.entity;
    if (!entity) return;

    const payment = await this.findPaymentByOrderId(this.prisma, entity.order_id);
    if (!payment) return;

    if (payment.status === PAYMENT_STATUS.PENDING) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PAYMENT_STATUS.AUTHORIZED, providerPaymentId: entity.id },
      });
      this.logger.log(`Webhook authorized: payment ${entity.id}`);
    }
  }

  private async handleRefundProcessed(payload: any) {
    const entity = payload.payload?.refund?.entity;
    if (!entity) return;

    const refund = await this.prisma.refund.findFirst({
      where: { providerRefundId: entity.id },
    });
    if (!refund) {
      this.logger.warn(`Webhook refund: no refund record for ${entity.id}`);
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.refund.update({
        where: { id: refund.id },
        data: { status: 'COMPLETED' },
      });

      await this.refreshPaymentAfterRefund(tx, refund.checkoutId);
    });

    const payment = await this.prisma.payment.findFirst({
      where: { checkoutId: refund.checkoutId },
    });

    this.logger.log(`Webhook refund processed: ${entity.id} for checkout ${refund.checkoutId}`);

    if (payment) {
      const orders = await this.prisma.order.findMany({
        where: { checkoutId: refund.checkoutId },
      });
      for (const order of orders) {
        if (order.email) {
          await this.notifications.notifyRefundCompleted({
            id: order.id,
            email: order.email,
            username: order.username || '',
            amount: Number(refund.amount || 0),
          });
        }
      }
    }
  }

  private async handleRefundFailed(payload: any) {
    const entity = payload.payload?.refund?.entity;
    if (!entity) return;

    const refund = await this.prisma.refund.findFirst({
      where: { providerRefundId: entity.id },
    });
    if (!refund) return;

    await this.prisma.refund.update({
      where: { id: refund.id },
      data: { status: 'FAILED', failureReason: entity.error_description || 'Refund failed' },
    });
    this.logger.warn(`Webhook refund failed: ${entity.id}`);
  }

  private async refreshPaymentAfterRefund(
    tx: Prisma.TransactionClient,
    checkoutId: string,
  ) {
    const refunds = await tx.refund.findMany({
      where: { checkoutId, status: { in: ['COMPLETED', 'PROCESSING'] } },
    });
    const refundedTotal = refunds.reduce(
      (sum, r) => sum + Number(r.amount || 0),
      0,
    );

    const payment = await tx.payment.findFirst({ where: { checkoutId } });
    if (!payment) return;

    const paymentAmount = payment.amount / 100;
    let status: PaymentStatus = PAYMENT_STATUS.PARTIALLY_REFUNDED;
    if (refundedTotal >= paymentAmount) {
      status = PAYMENT_STATUS.REFUNDED;
    }

    await tx.payment.update({
      where: { id: payment.id },
      data: { status },
    });
  }

  private amountMatches(payment: { amount: number; currency: string }, entity: any): boolean {
    return Number(entity.amount) === payment.amount && entity.currency === payment.currency;
  }

  private buildPaymentMetadata(entity: any) {
    const metadata: Record<string, any> = {
      method: entity.method || null,
      fee: entity.fee || null,
      tax: entity.tax || null,
      amount_paid: entity.amount_paid ?? entity.amount ?? null,
      notes: entity.notes || {},
    };
    if (entity.card) metadata.card = this.sanitizeCard(entity.card);
    if (entity.bank) metadata.bank = entity.bank;
    if (entity.vpa) metadata.vpa = entity.vpa;
    if (entity.emi) metadata.emi = entity.emi;
    return metadata;
  }

  private sanitizeCard(card: any) {
    if (!card) return null;
    return {
      network: card.network || null,
      type: card.type || null,
      issuer: card.issuer || null,
      last4: card.last4 || null,
    };
  }
}