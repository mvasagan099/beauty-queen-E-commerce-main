import { Test, TestingModule } from '@nestjs/testing';
import { WebhookService } from './webhook.service';
import { PrismaService } from '../prisma/prisma.service';
import { RazorpayService } from './razorpay.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CouponsService } from '../coupons/coupons.service';
import { RedisService } from '../common/redis.service';

describe('WebhookService', () => {
  let service: WebhookService;
  let prisma: Record<string, any>;
  let redis: Record<string, any>;
  let notifications: Record<string, any>;
  let coupons: Record<string, any>;

  const capturedWebhook = {
    event: 'payment.captured',
    payload: {
      payment: {
        entity: {
          id: 'pay_CAPTURED',
          order_id: 'order_PAY_TEST',
          status: 'captured',
          amount: 10000,
          amount_paid: 10000,
          currency: 'INR',
          method: 'upi',
          fee: 100,
          tax: 20,
        },
      },
    },
  };

  beforeEach(async () => {
    prisma = {
      paymentWebhookEvent: {
        findUnique: jest.fn().mockResolvedValue(null),
        upsert: jest.fn().mockImplementation(({ create }) =>
          Promise.resolve({ id: 1, ...create }),
        ),
        update: jest.fn().mockResolvedValue({ id: 1 }),
        create: jest.fn().mockResolvedValue({ id: 2 }),
      },
      payment: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      order: {
        findMany: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      orderStatusHistory: {
        create: jest.fn().mockResolvedValue({}),
      },
      refund: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      $transaction: jest.fn((fn: any) => fn(prisma)),
    };

    redis = {
      setNx: jest.fn().mockResolvedValue(true),
      del: jest.fn().mockResolvedValue(undefined),
    };

    notifications = {
      notifyPaymentSuccess: jest.fn().mockResolvedValue(undefined),
      notifyPaymentFailed: jest.fn().mockResolvedValue(undefined),
      notifyRefundCompleted: jest.fn().mockResolvedValue(undefined),
    };

    coupons = {
      releaseCoupon: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WebhookService,
        { provide: PrismaService, useValue: prisma },
        { provide: RazorpayService, useValue: {} },
        { provide: NotificationsService, useValue: notifications },
        { provide: CouponsService, useValue: coupons },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();

    service = module.get<WebhookService>(WebhookService);
  });

  describe('processWebhook', () => {
    it('returns idempotent result when the event was processed before', async () => {
      prisma.paymentWebhookEvent.findUnique.mockResolvedValue({
        processed: true,
      });

      const result = await service.processWebhook('payment.captured', capturedWebhook);

      expect(result).toEqual({ success: true, processed: false, status: 'idempotent' });
      expect(redis.setNx).not.toHaveBeenCalled();
    });

    it('marks the event processed after handling a capture', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 10,
        checkoutId: 'checkout-1',
        amount: 10000,
        currency: 'INR',
        status: 'PENDING',
        method: null,
        metadata: null,
      });
      prisma.order.findMany.mockResolvedValue([
        {
          id: 1,
          checkoutId: 'checkout-1',
          status: 'Pending',
          paymentStatus: 'Pending',
          email: 'a@b.com',
          username: 'Alice',
          totalAmount: 100,
        },
      ]);

      const result = await service.processWebhook('payment.captured', capturedWebhook);

      expect(result).toEqual({ success: true, processed: true });
      expect(prisma.paymentWebhookEvent.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { processed: true, processedAt: expect.any(Date) },
      });
      expect(notifications.notifyPaymentSuccess).toHaveBeenCalledTimes(1);
    });

    it('does not confirm orders when the captured amount mismatches backend record', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 10,
        checkoutId: 'checkout-1',
        amount: 5000,
        currency: 'INR',
        status: 'PENDING',
        method: null,
        metadata: null,
      });
      prisma.order.findMany.mockResolvedValue([
        {
          id: 1,
          checkoutId: 'checkout-1',
          status: 'Pending',
          paymentStatus: 'Pending',
          email: 'a@b.com',
        },
      ]);

      const result = await service.processWebhook('payment.captured', capturedWebhook);

      expect(result).toEqual({ success: true, processed: true });
      // No order was updated or notified on amount mismatch.
      expect(notifications.notifyPaymentSuccess).not.toHaveBeenCalled();
      expect(prisma.payment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ failureReason: expect.stringContaining('mismatch') }),
        }),
      );
    });

    it('marks payment failed and releases coupon on payment.failed', async () => {
      prisma.payment.findFirst.mockResolvedValue({
        id: 10,
        checkoutId: 'checkout-1',
        status: 'PENDING',
        userId: 5,
      });
      prisma.order.findMany.mockResolvedValue([
        {
          id: 1,
          checkoutId: 'checkout-1',
          status: 'Pending',
          paymentStatus: 'Pending',
          email: 'a@b.com',
          username: 'Alice',
          totalAmount: 100,
          couponCode: 'SAVE10',
          userId: 5,
        },
      ]);

      const failedWebhook = {
        event: 'payment.failed',
        payload: {
          payment: {
            entity: {
              id: 'pay_FAILED',
              order_id: 'order_PAY_TEST',
              status: 'failed',
              amount: 10000,
              currency: 'INR',
              error_code: 'BAD_REQUEST',
              error_description: 'Payment declined',
            },
          },
        },
      };

      const result = await service.processWebhook('payment.failed', failedWebhook);

      expect(result).toEqual({ success: true, processed: true });
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { status: 'FAILED', failureReason: 'Payment declined' },
      });
      expect(coupons.releaseCoupon).toHaveBeenCalledWith('SAVE10', 5);
      expect(notifications.notifyPaymentFailed).toHaveBeenCalledTimes(1);
    });
  });
});