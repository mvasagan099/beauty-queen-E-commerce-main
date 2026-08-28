import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { v4 as uuidv4 } from 'uuid';
import { PrismaService } from '../prisma/prisma.service';
import { EmailEventType, InAppNotificationType, EmailJobPayload, InAppNotificationPayload } from './types/notification.types';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    @InjectQueue('email') private emailQueue: Queue,
    @InjectQueue('notifications') private notificationQueue: Queue,
    private prisma: PrismaService,
  ) {}

  async sendEmail(
    eventType: EmailEventType,
    to: string,
    data: Record<string, any>,
    eventId?: string,
  ): Promise<void> {
    // Marketers/recurring jobs pass a deterministic eventId so repeated runs
    // never double-send; transactional sends keep a fresh id per event.
    const resolvedEventId = eventId || uuidv4();
    const payload: EmailJobPayload = { eventId: resolvedEventId, type: eventType, to, data };

    const job = await this.enqueueWithTimeout(
      this.emailQueue.add(eventType, payload, {
        jobId: resolvedEventId,
        priority: eventType === EmailEventType.OTP_REQUESTED ? 1 : 5,
      }),
      `email:${eventType} to ${to}`,
    );
    if (job) {
      this.logger.log(`Email queued: ${eventType} to ${to}, eventId=${resolvedEventId}, jobId=${job.id}`);
    }
  }

  async createInAppNotification(
    userId: number,
    type: InAppNotificationType,
    title: string,
    message: string,
    data?: Record<string, any>,
  ): Promise<void> {
    const payload: InAppNotificationPayload = { userId, type, title, message, data };

    const job = await this.enqueueWithTimeout(
      this.notificationQueue.add('in-app-notification', payload, {
        priority: 3,
      }),
      `in-app-notification type=${type}, userId=${userId}`,
    );
    if (job) {
      this.logger.log(`In-app notification queued: type=${type}, userId=${userId}`);
    }
  }

  /**
   * Bounded enqueue so a Redis outage never blocks the request lifecycle.
   * BullMQ can wait indefinitely for its connection when Redis is down; this
   * races the add() call against a short timeout and logs instead of hanging.
   */
  private async enqueueWithTimeout<T>(operation: Promise<T>, label: string, timeoutMs = 1500): Promise<T | null> {
    let timer: NodeJS.Timeout | undefined = undefined;
    const timeout = new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new Error(`Timed out after ${timeoutMs}ms`)), timeoutMs);
    });
    try {
      return await Promise.race([operation, timeout]);
    } catch (error) {
      this.logger.error(`Failed to queue ${label}: ${error.message}`);
      return null;
    } finally {
      if (timer) {
        clearTimeout(timer);
      }
    }
  }

  async notifyOrderCreated(order: {
    id: number;
    email: string;
    username: string;
    productName: string;
    price: number;
    quantity: number;
    total: number;
    paymentMethod: string;
  }): Promise<void> {
    if (!order.email) return;

    await this.sendEmail(EmailEventType.ORDER_CREATED, order.email, {
      orderId: order.id,
      username: order.username,
      productName: order.productName,
      price: order.price,
      quantity: order.quantity,
      total: order.total,
      paymentMethod: order.paymentMethod,
    });

    await this.createInAppNotification(
      order.id,
      InAppNotificationType.ORDER_UPDATE,
      'Order Confirmed',
      `Your order #${order.id} for ${order.productName} has been confirmed.`,
      { orderId: order.id },
    );
  }

  async notifyOrderStatusChanged(order: {
    id: number;
    email: string;
    username: string;
    productName: string;
    oldStatus: string;
    newStatus: string;
    carrier?: string;
    trackingNumber?: string;
    trackingUrl?: string;
  }): Promise<void> {
    const statusEmailMap: Record<string, EmailEventType> = {
      Confirmed: EmailEventType.ORDER_CONFIRMED,
      Processing: EmailEventType.ORDER_PROCESSING,
      Shipped: EmailEventType.ORDER_SHIPPED,
      Delivered: EmailEventType.ORDER_DELIVERED,
      Cancelled: EmailEventType.ORDER_CANCELLED,
    };

    const eventType = statusEmailMap[order.newStatus];
    if (!eventType) {
      this.logger.log(`No email configured for status: ${order.newStatus}`);
      return;
    }

    if (order.email) {
      await this.sendEmail(eventType, order.email, {
        orderId: order.id,
        username: order.username,
        productName: order.productName,
        oldStatus: order.oldStatus,
        newStatus: order.newStatus,
        carrier: order.carrier,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
      });
    }

    const statusMessages: Record<string, string> = {
      Confirmed: 'has been confirmed',
      Processing: 'is now being processed',
      Shipped: 'has been shipped',
      Delivered: 'has been delivered',
      Cancelled: 'has been cancelled',
    };

    await this.createInAppNotification(
      order.id,
      InAppNotificationType.ORDER_UPDATE,
      `Order ${order.newStatus}`,
      `Your order #${order.id} ${statusMessages[order.newStatus] || `status updated to ${order.newStatus}`}.`,
      { orderId: order.id, oldStatus: order.oldStatus, newStatus: order.newStatus },
    );
  }

  async notifyOrderCancelled(order: {
    id: number;
    email: string;
    username: string;
    productName: string;
    reason?: string;
  }): Promise<void> {
    if (!order.email) return;

    await this.sendEmail(EmailEventType.ORDER_CANCELLED, order.email, {
      orderId: order.id,
      username: order.username,
      productName: order.productName,
      reason: order.reason,
    });

    await this.createInAppNotification(
      order.id,
      InAppNotificationType.ORDER_UPDATE,
      'Order Cancelled',
      `Your order #${order.id} for ${order.productName} has been cancelled.`,
      { orderId: order.id },
    );

    this.logger.log(`Cancellation notification queued for order ${order.id}`);
  }

  async notifyPaymentSuccess(order: {
    id: number;
    email: string;
    username: string;
    amount: number;
    paymentMethod: string;
  }): Promise<void> {
    if (!order.email) return;

    await this.sendEmail(EmailEventType.PAYMENT_SUCCESS, order.email, {
      orderId: order.id,
      username: order.username,
      amount: order.amount,
      paymentMethod: order.paymentMethod,
    });

    await this.createInAppNotification(
      order.id,
      InAppNotificationType.PAYMENT_UPDATE,
      'Payment Successful',
      `Payment of ₹${order.amount} for order #${order.id} confirmed.`,
      { orderId: order.id },
    );
  }

  async notifyPaymentFailed(order: {
    id: number;
    email: string;
    username: string;
    amount: number;
    reason?: string;
  }): Promise<void> {
    if (!order.email) return;

    await this.sendEmail(EmailEventType.PAYMENT_FAILED, order.email, {
      orderId: order.id,
      username: order.username,
      amount: order.amount,
      reason: order.reason,
    });
  }

  async notifyOtpRequested(email: string, otp: string): Promise<void> {
    await this.sendEmail(EmailEventType.OTP_REQUESTED, email, { otp });
  }

  async notifyReturnRequested(order: {
    id: number;
    email: string;
    username: string;
    productName: string;
    reason: string;
  }): Promise<void> {
    if (!order.email) return;

    await this.sendEmail(EmailEventType.RETURN_REQUESTED, order.email, {
      orderId: order.id,
      username: order.username,
      productName: order.productName,
      reason: order.reason,
    });
  }

  async notifyReturnApproved(order: {
    id: number;
    email: string;
    username: string;
    productName: string;
  }): Promise<void> {
    if (!order.email) return;

    await this.sendEmail(EmailEventType.RETURN_APPROVED, order.email, {
      orderId: order.id,
      username: order.username,
      productName: order.productName,
    });
  }

  async notifyReturnRejected(order: {
    id: number;
    email: string;
    username: string;
    productName: string;
    reason?: string;
  }): Promise<void> {
    if (!order.email) return;

    await this.sendEmail(EmailEventType.RETURN_REJECTED, order.email, {
      orderId: order.id,
      username: order.username,
      productName: order.productName,
      reason: order.reason,
    });
  }

  async notifyRefundInitiated(order: {
    id: number;
    email: string;
    username: string;
    amount: number;
  }): Promise<void> {
    if (!order.email) return;

    await this.sendEmail(EmailEventType.REFUND_INITIATED, order.email, {
      orderId: order.id,
      username: order.username,
      amount: order.amount,
    });
  }

  async notifyRefundCompleted(order: {
    id: number;
    email: string;
    username: string;
    amount: number;
  }): Promise<void> {
    if (!order.email) return;

    await this.sendEmail(EmailEventType.REFUND_COMPLETED, order.email, {
      orderId: order.id,
      username: order.username,
      amount: order.amount,
    });
  }

  /** Whether the user has opted in to marketing/promotional email. */
  async hasPromotionalConsent(userId: number): Promise<boolean> {
    const prefs = await this.prisma.notificationPreference.findUnique({
      where: { userId },
      select: { promotional: true },
    });
    return prefs?.promotional ?? false;
  }

  /** Get the user's notification preferences (created with defaults on first read). */
  async getPreferences(userId: number) {
    return this.prisma.notificationPreference.upsert({
      where: { userId },
      update: {},
      create: { userId },
    });
  }

  /** Update notification preferences; only provided fields are changed. */
  async updatePreferences(
    userId: number,
    dto: { orderUpdates?: boolean; paymentUpdates?: boolean; promotional?: boolean },
  ) {
    const existing =
      (await this.prisma.notificationPreference.findUnique({ where: { userId } })) || null;

    const defaults = {
      orderUpdates: true,
      paymentUpdates: true,
      promotional: false,
    };

    const data: Record<string, boolean> = {};
    if (dto.orderUpdates !== undefined) data.orderUpdates = dto.orderUpdates;
    if (dto.paymentUpdates !== undefined) data.paymentUpdates = dto.paymentUpdates;
    if (dto.promotional !== undefined) data.promotional = dto.promotional;

    const prefs = await this.prisma.notificationPreference.upsert({
      where: { userId },
      update: data,
      create: { userId, ...defaults, ...data },
    });

    this.logger.log(`Notification preferences updated for user ${userId}: ${JSON.stringify(prefs)}`);
    return prefs;
  }

  async notifyBackInStock(
    details: {
      userId: number;
      email: string;
      username: string;
      productId: number;
      productName: string;
      image?: string | null;
      size?: string | null;
      price?: number | null;
      productUrl?: string;
    },
    alertId: number,
  ): Promise<void> {
    const data = {
      username: details.username,
      productName: details.productName,
      image: details.image,
      size: details.size,
      price: details.price,
      productUrl: details.productUrl,
      productId: details.productId,
    };

    await this.sendEmail(EmailEventType.BACK_IN_STOCK, details.email, data, `back-in-stock:${alertId}`);

    await this.createInAppNotification(
      details.userId,
      InAppNotificationType.SYSTEM,
      'Back in stock',
      `Good news: ${details.productName} is back in stock.`,
      { productId: details.productId },
    );
  }

  async notifyPriceDrop(
    details: {
      userId: number;
      email: string;
      username: string;
      productId: number;
      productName: string;
      image?: string | null;
      watchedPrice: number;
      currentPrice: number;
      oldPrice?: number | null;
      productUrl?: string;
    },
    alertId: number,
  ): Promise<void> {
    const data = {
      username: details.username,
      productName: details.productName,
      image: details.image,
      watchedPrice: details.watchedPrice,
      currentPrice: details.currentPrice,
      oldPrice: details.oldPrice,
      productUrl: details.productUrl,
      productId: details.productId,
    };

    await this.sendEmail(EmailEventType.PRICE_DROP, details.email, data, `price-drop:${alertId}`);

    await this.createInAppNotification(
      details.userId,
      InAppNotificationType.SYSTEM,
      'Price drop',
      `${details.productName} is now ₹${details.currentPrice}.`,
      { productId: details.productId },
    );
  }

  async notifyCartReminder(
    details: {
      userId: number;
      email: string;
      username: string;
      items: Array<{ productName: string; image?: string | null; price: number; quantity: number; size?: string }>;
      total: number;
      cartUrl?: string;
    },
    logId: number,
  ): Promise<void> {
    const data = {
      username: details.username,
      items: details.items,
      total: details.total,
      cartUrl: details.cartUrl,
    };

    await this.sendEmail(EmailEventType.CART_REMINDER, details.email, data, `cart-reminder:${logId}`);
  }

  async notifySupportTicket(
    eventType:
      | EmailEventType.SUPPORT_TICKET_CREATED
      | EmailEventType.SUPPORT_TICKET_REPLIED
      | EmailEventType.SUPPORT_TICKET_RESOLVED
      | EmailEventType.SUPPORT_TICKET_CLOSED,
    details: {
      userId: number;
      email: string;
      username: string;
      ticketId: number;
      ticketNumber: string;
      subject: string;
      status: string;
      message?: string;
      dashboardUrl?: string;
    },
  ): Promise<void> {
    const data = {
      username: details.username,
      ticketNumber: details.ticketNumber,
      subject: details.subject,
      status: details.status,
      message: details.message,
      dashboardUrl: details.dashboardUrl,
    };

    await this.sendEmail(eventType, details.email, data, `support-ticket:${details.ticketId}:${eventType}`);

    await this.createInAppNotification(
      details.userId,
      InAppNotificationType.SYSTEM,
      `Support ticket ${['RESOLVED', 'CLOSED'].includes(details.status.toUpperCase()) ? 'update' : eventType === EmailEventType.SUPPORT_TICKET_CREATED ? 'created' : 'reply'}`,
      `Support ticket #${details.ticketNumber} ${eventType === EmailEventType.SUPPORT_TICKET_CREATED ? 'has been opened' : 'has been updated'}.`,
      { ticketId: details.ticketId },
    );
  }
}
