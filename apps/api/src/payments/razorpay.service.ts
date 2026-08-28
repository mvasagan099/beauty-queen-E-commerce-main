import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as crypto from 'crypto';

@Injectable()
export class RazorpayService implements OnModuleInit {
  private readonly logger = new Logger(RazorpayService.name);
  private razorpay: any;
  private keyId: string;
  private keySecret: string;
  private webhookSecret: string;

  constructor(private configService: ConfigService) {}

  onModuleInit() {
    this.keyId = this.configService.get<string>('RAZORPAY_KEY_ID', '');
    this.keySecret = this.configService.get<string>('RAZORPAY_KEY_SECRET', '');
    this.webhookSecret = this.configService.get<string>('RAZORPAY_WEBHOOK_SECRET', '');

    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');
    if (nodeEnv === 'production') {
      if (!this.keyId || !this.keySecret) {
        throw new Error('Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) are required in production');
      }
      if (!this.webhookSecret) {
        this.logger.warn('RAZORPAY_WEBHOOK_SECRET not set — webhook signature verification will use key secret');
      }
    } else if (!this.keyId || !this.keySecret) {
      this.logger.warn('Razorpay credentials not configured. Payment operations will fail.');
    }
  }

  async getRazorpayInstance() {
    if (this.razorpay) return this.razorpay;

    const Razorpay = (await import('razorpay')).default;
    this.razorpay = new Razorpay({
      key_id: this.keyId,
      key_secret: this.keySecret,
    });

    return this.razorpay;
  }

  async createOrder(amountInPaise: number, receipt: string) {
    const rz = await this.getRazorpayInstance();
    const order = await rz.orders.create({
      amount: amountInPaise,
      currency: 'INR',
      receipt,
    });
    this.logger.log(`Razorpay order created: ${order.id} for ${amountInPaise} paise`);
    return order;
  }

  /** Fetch the authoritative order record from Razorpay. */
  async fetchOrder(orderId: string) {
    const rz = await this.getRazorpayInstance();
    const order = await rz.orders.fetch(orderId);
    this.logger.log(`Razorpay order fetched: ${orderId} (status: ${order.status})`);
    return order;
  }

  /** Fetch the authoritative payment record from Razorpay. */
  async fetchPayment(paymentId: string) {
    const rz = await this.getRazorpayInstance();
    const payment = await rz.payments.fetch(paymentId);
    this.logger.log(`Razorpay payment fetched: ${paymentId} (status: ${payment.status})`);
    return payment;
  }

  /** Create a refund against a captured payment. Amount is in paise. */
  async refundPayment(paymentId: string, amountInPaise: number, notes?: Record<string, string>) {
    const rz = await this.getRazorpayInstance();
    const refund = await rz.payments.refund(paymentId, {
      amount: amountInPaise,
      speed: 'normal',
      notes: notes || {},
    });
    this.logger.log(`Razorpay refund created: ${refund.id} for payment ${paymentId}`);
    return refund;
  }

  private safeCompare(expected: Buffer, actual: Buffer): boolean {
    if (expected.length !== actual.length) return false;
    return crypto.timingSafeEqual(expected, actual);
  }

  verifySignature(orderId: string, paymentId: string, signature: string): boolean {
    if (!signature) {
      this.logger.warn('Signature verification rejected: empty signature');
      return false;
    }
    const expected = crypto
      .createHmac('sha256', this.keySecret)
      .update(`${orderId}|${paymentId}`)
      .digest();

    const isValid = this.safeCompare(expected, Buffer.from(signature, 'hex'));
    if (!isValid) {
      this.logger.warn(`Signature verification failed for order ${orderId}`);
    }
    return isValid;
  }

  verifyWebhookSignature(body: string | Buffer, signature: string): boolean {
    if (!signature) {
      this.logger.warn('Webhook signature verification rejected: empty signature');
      return false;
    }
    const secret = this.webhookSecret || this.keySecret;
    const expected = crypto
      .createHmac('sha256', secret)
      .update(body)
      .digest();

    const isValid = this.safeCompare(expected, Buffer.from(signature, 'hex'));
    if (!isValid) {
      this.logger.warn('Webhook signature verification failed');
    }
    return isValid;
  }

  getKeyId(): string {
    return this.keyId;
  }

  hasWebhookSecret(): boolean {
    return Boolean(this.webhookSecret);
  }
}