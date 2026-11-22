import { AbandonedCartService } from './abandoned-cart.service';

describe('AbandonedCartService', () => {
  let service: AbandonedCartService;
  let prisma: any;
  let redis: any;
  let notifications: any;
  let whatsapp: any;
  let redisStore: Map<string, string>;

  beforeEach(() => {
    redisStore = new Map();
    prisma = {
      cartItem: { findMany: jest.fn() },
      order: { findFirst: jest.fn() },
    };
    redis = {
      get: jest.fn(async (k: string) => redisStore.get(k) ?? null),
      set: jest.fn(async (k: string, v: string) => {
        redisStore.set(k, v);
      }),
    };
    notifications = {
      sendEmail: jest.fn().mockResolvedValue(undefined),
      createInAppNotification: jest.fn().mockResolvedValue(undefined),
    };
    whatsapp = {
      sendTextMessage: jest.fn().mockResolvedValue({ sent: true, providerMessageId: 'wa-1' }),
    };

    service = new AbandonedCartService(prisma, redis, notifications, whatsapp);
  });

  it('sends email, in-app, and WhatsApp reminders for idle carts and dedupes within 24h', async () => {
    prisma.cartItem.findMany.mockResolvedValue([
      {
        userId: 5,
        quantity: 2,
        user: { id: 5, email: 'ananya@example.com', name: 'Ananya', phone: '9876543210' },
        product: { id: 10, name: 'Kanjeevaram Crimson Saree', price: 4500 },
      },
    ]);
    prisma.order.findFirst.mockResolvedValue(null);

    const first = await service.runRecoverySweep(120);
    expect(first).toEqual({
      scannedCarts: 1,
      remindedCount: 1,
      skippedRecentOrder: 0,
      skippedAlreadyReminded: 0,
      whatsappDispatched: 1,
    });
    expect(notifications.sendEmail).toHaveBeenCalledTimes(1);
    expect(notifications.createInAppNotification).toHaveBeenCalledTimes(1);
    expect(whatsapp.sendTextMessage).toHaveBeenCalledTimes(1);

    // Second sweep within 24h is deduped cleanly
    const second = await service.runRecoverySweep(120);
    expect(second.remindedCount).toBe(0);
    expect(second.skippedAlreadyReminded).toBe(1);
  });

  it('skips users who already placed a recent non-cancelled order', async () => {
    prisma.cartItem.findMany.mockResolvedValue([
      {
        userId: 8,
        quantity: 1,
        user: { id: 8, email: 'divya@example.com', name: 'Divya', phone: null },
        product: { id: 12, name: 'Velvet Kumkum Lip Tint', price: 749 },
      },
    ]);
    prisma.order.findFirst.mockResolvedValue({ id: 99 });

    const res = await service.runRecoverySweep(120);
    expect(res.remindedCount).toBe(0);
    expect(res.skippedRecentOrder).toBe(1);
    expect(notifications.sendEmail).not.toHaveBeenCalled();
  });
});
