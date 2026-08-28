import * as crypto from 'crypto';
import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { RazorpayService } from './razorpay.service';

describe('RazorpayService', () => {
  let service: RazorpayService;

  const keyId = 'rzp_test_key';
  const keySecret = 'test_key_secret';
  const webhookSecret = 'test_webhook_secret';

  const mockConfig = {
    get: jest.fn((key: string, fallback?: any) => {
      const values: Record<string, any> = {
        RAZORPAY_KEY_ID: keyId,
        RAZORPAY_KEY_SECRET: keySecret,
        RAZORPAY_WEBHOOK_SECRET: webhookSecret,
        NODE_ENV: 'test',
      };
      return values[key] ?? fallback;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RazorpayService,
        { provide: ConfigService, useValue: mockConfig },
      ],
    }).compile();

    service = module.get<RazorpayService>(RazorpayService);
    service.onModuleInit();
  });

  describe('verifySignature', () => {
    it('returns true for a valid signature', () => {
      const orderId = 'order_O1';
      const paymentId = 'pay_P1';
      const signature = crypto
        .createHmac('sha256', keySecret)
        .update(`${orderId}|${paymentId}`)
        .digest('hex');

      expect(service.verifySignature(orderId, paymentId, signature)).toBe(true);
    });

    it('returns false for an invalid signature', () => {
      expect(service.verifySignature('order_O1', 'pay_P1', 'bogus')).toBe(false);
    });

    it('returns false when signature is empty', () => {
      expect(service.verifySignature('order_O1', 'pay_P1', '')).toBe(false);
    });
  });

  describe('verifyWebhookSignature', () => {
    it('returns true for a valid signature', () => {
      const body = JSON.stringify({ event: 'payment.captured', contains: ['payment'] });
      const signature = crypto
        .createHmac('sha256', webhookSecret)
        .update(body)
        .digest('hex');

      expect(service.verifyWebhookSignature(body, signature)).toBe(true);
    });

    it('returns false for an invalid signature', () => {
      expect(
        service.verifyWebhookSignature('{"event":"payment.captured"}', 'bad-signature'),
      ).toBe(false);
    });

    it('returns false when signature is empty', () => {
      expect(service.verifyWebhookSignature('{}', '')).toBe(false);
    });
  });

  describe('hasWebhookSecret', () => {
    it('exposes whether a dedicated webhook secret is configured', () => {
      expect(service.hasWebhookSecret()).toBe(true);
    });
  });
});