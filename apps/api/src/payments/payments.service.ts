import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../common/redis.service';
import { RazorpayService } from './razorpay.service';
import { WebhookService } from './webhook.service';
import { CartService } from '../cart/cart.service';
import { PricingService } from '../pricing/pricing.service';
import { CouponsService } from '../coupons/coupons.service';
import { NotificationsService } from '../notifications/notifications.service';
import {
  CreateCheckoutDto,
  VerifyPaymentDto,
} from './dto/payment.dto';
import {
  CalculatedCheckout,
  PaymentCreateOrderResult,
  PaymentRetryResult,
  PaymentStatusResult,
  PaymentVerifyResult,
  WebhookProcessResult,
} from './types/payment.types';
import {
  PAYMENT_STATUS,
  PAYMENT_REDIS_KEYS,
  PAYMENT_CURRENCY,
} from './types/payment-status';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private razorpay: RazorpayService,
    private cartService: CartService,
    private pricingService: PricingService,
    private couponsService: CouponsService,
    private notifications: NotificationsService,
    private webhookService: WebhookService,
    private redisService: RedisService,
  ) {}

  async createCheckout(userId: number, dto: CreateCheckoutDto) {
    const checkoutId = uuidv4();

    let items: { productId: number; size: string; quantity: number }[] = [];

    if (dto.source === 'cart') {
      const cart = await this.cartService.getCart(userId);
      if (!cart.items || cart.items.length === 0) {
        throw new BadRequestException('Cart is empty');
      }

      for (const cartItem of cart.items) {
        items.push({
          productId: cartItem.productId,
          size: cartItem.size,
          quantity: cartItem.quantity,
        });
      }
    } else {
      if (!dto.buynowItem) {
        throw new BadRequestException('buynowItem is required for buynow source');
      }
      items.push({
        productId: dto.buynowItem.productId,
        size: dto.buynowItem.size,
        quantity: dto.buynowItem.quantity,
      });
    }

    const pricing = await this.pricingService.calculatePricing({
      items,
      couponCode: dto.couponCode,
      userId,
      pincode: dto.pincode,
      district: dto.district,
    });

    const calculated: CalculatedCheckout = {
      checkoutId,
      items: pricing.items.map((item) => ({
        productId: item.productId,
        size: item.size,
        quantity: item.quantity,
        name: item.name,
        price: item.unitPrice,
      })),
      subtotal: pricing.subtotal,
      productDiscount: pricing.productDiscount,
      couponCode: dto.couponCode,
      couponDiscount: pricing.couponDiscount,
      shipping: pricing.shipping,
      tax: pricing.tax,
      totalAmount: pricing.total,
      totalAmountPaise: pricing.total * 100,
    };

    const orders: any[] = [];
    await this.prisma.$transaction(async (tx) => {
      for (const item of calculated.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, deletedAt: null },
        });
        if (!product) {
          throw new BadRequestException(`Product ${item.productId} not found`);
        }

        const sizeField = this.getSizeField(item.size);
        const lockedRows = await tx.$queryRawUnsafe(
          `SELECT ${sizeField} AS qty FROM products WHERE id = ? FOR UPDATE`,
          item.productId,
        );
        const lockedQty = (lockedRows as any)[0]?.qty ?? 0;
        if (lockedQty < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for ${product.name} (${item.size}). Available: ${lockedQty}`,
          );
        }

        const orderItemPricing = pricing.items.find(
          (pi) => pi.productId === item.productId && pi.size === item.size,
        );

        const order = await tx.order.create({
          data: {
            checkoutId,
            userId,
            productId: item.productId,
            sellerId: product.sellerId,
            name: item.name,
            size: item.size,
            price: item.price,
            quantity: item.quantity,
            subtotal: orderItemPricing?.lineTotal || item.price * item.quantity,
            discountAmount: orderItemPricing?.lineDiscount || 0,
            couponCode: dto.couponCode || null,
            couponDiscount: pricing.couponDiscount,
            shippingAmount: pricing.shipping,
            taxAmount: pricing.tax,
            totalAmount: pricing.total,
            username: dto.name,
            email: dto.email,
            address: dto.address,
            pincode: dto.pincode,
            district: dto.district,
            landmark: dto.landmark || null,
            paymentMethod: dto.paymentMethod,
            paymentStatus: 'Pending',
            status: 'Pending',
          },
        });

        await tx.orderStatusHistory.create({
          data: {
            orderId: order.id,
            oldStatus: null,
            newStatus: 'Pending',
          },
        });

        await tx.product.update({
          where: { id: item.productId },
          data: { [sizeField]: { decrement: item.quantity } },
        });

        orders.push(order);
      }

      await tx.payment.create({
        data: {
          checkoutId,
          userId,
          provider: 'razorpay',
          amount: calculated.totalAmountPaise,
          currency: PAYMENT_CURRENCY,
          status: PAYMENT_STATUS.PENDING,
          method: dto.paymentMethod,
          metadata: {
            paymentMethod: dto.paymentMethod,
            source: dto.source,
            couponCode: dto.couponCode || null,
            attempts: 0,
          } as any,
        },
      });
    });

    if (dto.couponCode) {
      try {
        await this.couponsService.consumeCoupon(dto.couponCode, userId, checkoutId);
      } catch (err: any) {
        this.logger.warn(`Failed to consume coupon ${dto.couponCode}: ${err.message}`);
      }
    }

    this.logger.log(
      `Checkout ${checkoutId} created: ${orders.length} orders, total ${calculated.totalAmount} INR (discount: ${calculated.productDiscount + calculated.couponDiscount}, shipping: ${calculated.shipping}, tax: ${calculated.tax})`,
    );

    let razorpayOrder = null;
    if (dto.paymentMethod === 'upi' && calculated.totalAmount > 0) {
      razorpayOrder = await this.razorpay.createOrder(
        calculated.totalAmountPaise,
        checkoutId,
      );

      await this.prisma.payment.updateMany({
        where: { checkoutId },
        data: { providerOrderId: razorpayOrder.id },
      });
    }

    return {
      checkoutId,
      orders: orders.map((o) => ({
        id: o.id,
        name: o.name,
        size: o.size,
        quantity: o.quantity,
        subtotal: Number(o.subtotal),
      })),
      subtotal: calculated.subtotal,
      productDiscount: calculated.productDiscount,
      couponCode: calculated.couponCode,
      couponDiscount: calculated.couponDiscount,
      shipping: calculated.shipping,
      tax: calculated.tax,
      totalAmount: calculated.totalAmount,
      paymentMethod: dto.paymentMethod,
      razorpayOrderId: razorpayOrder?.id || null,
      razorpayKeyId: dto.paymentMethod === 'upi' ? this.razorpay.getKeyId() : null,
    };
  }

  /**
   * Create (or return an existing) Razorpay order for a checkout.
   * The amount is always taken from the authoritative backend payment record.
   */
  async createOrderForCheckout(
    userId: number,
    checkoutId: string,
  ): Promise<PaymentCreateOrderResult> {
    const payment = await this.prisma.payment.findFirst({
      where: { checkoutId },
    });
    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }
    await this.assertPaymentOwnership(userId, payment);

    if (payment.providerOrderId && payment.status === PAYMENT_STATUS.PENDING) {
      return {
        checkoutId,
        razorpayOrderId: payment.providerOrderId,
        amount: payment.amount,
        currency: payment.currency,
        keyId: this.razorpay.getKeyId(),
      };
    }

    const razorpayOrder = await this.razorpay.createOrder(
      payment.amount,
      checkoutId,
    );

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: { providerOrderId: razorpayOrder.id },
    });

    return {
      checkoutId,
      razorpayOrderId: razorpayOrder.id,
      amount: payment.amount,
      currency: payment.currency,
      keyId: this.razorpay.getKeyId(),
    };
  }

  async verifyPayment(userId: number, dto: VerifyPaymentDto): Promise<PaymentVerifyResult> {
    const payment = await this.prisma.payment.findFirst({
      where: { providerOrderId: dto.razorpayOrderId },
    });
    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }
    await this.assertPaymentOwnership(userId, payment);

    const orders = await this.prisma.order.findMany({
      where: { checkoutId: payment.checkoutId },
    });
    if (orders.length === 0) {
      throw new NotFoundException('No orders found for this payment');
    }

    if (payment.status === PAYMENT_STATUS.CAPTURED && payment.signatureVerified) {
      this.logger.log(`Payment ${dto.razorpayOrderId} already verified (idempotent)`);
      const refreshedOrders = await this.prisma.order.findMany({
        where: { checkoutId: payment.checkoutId },
        include: { product: true },
      });
      return {
        success: true,
        message: 'Payment already processed',
        orders: refreshedOrders,
      };
    }

    const isValid = this.razorpay.verifySignature(
      dto.razorpayOrderId,
      dto.razorpayPaymentId,
      dto.razorpaySignature,
    );

    if (!isValid) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: { status: PAYMENT_STATUS.FAILED, failureReason: 'Invalid signature' },
      });

      await this.releaseCouponForCheckout(payment.checkoutId);

      throw new BadRequestException('Payment signature verification failed');
    }

    // Cross-check the provider's authoritative payment record against our amount/currency.
    let providerPayment: any;
    try {
      providerPayment = await this.razorpay.fetchPayment(dto.razorpayPaymentId);
    } catch (err: any) {
      this.logger.error(`Failed to fetch Razorpay payment ${dto.razorpayPaymentId}: ${err.message}`);
      throw new BadRequestException('Payment verification failed');
    }

    const amountMatches =
      Number(providerPayment.amount) === payment.amount &&
      String(providerPayment.currency) === payment.currency;
    const orderMatches = providerPayment.order_id === dto.razorpayOrderId;
    const statusMatches = ['captured', 'authorized'].includes(providerPayment.status);

    if (!amountMatches || !orderMatches || !statusMatches) {
      this.logger.error(
        `Provider mismatch for payment ${dto.razorpayPaymentId}: ` +
          `backend=${payment.amount}${payment.currency} order=${dto.razorpayOrderId}, ` +
          `provider=${providerPayment.amount}${providerPayment.currency} status=${providerPayment.status} order=${providerPayment.order_id}`,
      );
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PAYMENT_STATUS.FAILED,
          failureReason: 'Payment verification failed: amount/status mismatch',
          metadata: {
            ...((payment.metadata as any) || {}),
            providerMismatch: {
              provider: {
                amount: providerPayment.amount,
                currency: providerPayment.currency,
                status: providerPayment.status,
              },
              expected: { amount: payment.amount, currency: payment.currency },
            },
          } as any,
        },
      });

      await this.releaseCouponForCheckout(payment.checkoutId);
      throw new BadRequestException('Payment verification failed');
    }

    const lockKey = PAYMENT_REDIS_KEYS.verifyLock(payment.id);
    const lockAcquired = await this.redisService.setNx(lockKey, '1', 30);
    if (!lockAcquired) {
      this.logger.log(`Payment ${payment.id} verification already in progress`);
      const current = await this.prisma.payment.findUnique({
        where: { id: payment.id },
      });
      if (current?.status === PAYMENT_STATUS.CAPTURED && current.signatureVerified) {
        const refreshedOrders = await this.prisma.order.findMany({
          where: { checkoutId: payment.checkoutId },
          include: { product: true },
        });
        return { success: true, message: 'Payment already processed', orders: refreshedOrders };
      }
      throw new BadRequestException('Payment is being processed, please retry shortly');
    }

    try {
      const updatedOrders = await this.confirmPayment(
        payment.id,
        dto.razorpayPaymentId,
        providerPayment,
      );

      await this.cartService.clearCart(userId);

      for (const order of updatedOrders) {
        if (order.email) {
          await this.notifications.notifyPaymentSuccess({
            id: order.id,
            email: order.email,
            username: order.username || '',
            amount: Number(order.totalAmount || 0),
            paymentMethod: providerPayment.method || 'upi',
          });
        }
      }

      this.logger.log(`Payment verified and orders confirmed for checkout ${payment.checkoutId}`);

      return {
        success: true,
        message: 'Payment verified successfully',
        payment: { id: payment.id, checkoutId: payment.checkoutId, status: PAYMENT_STATUS.CAPTURED },
        orders: updatedOrders,
      };
    } finally {
      await this.redisService.del(lockKey);
    }
  }

  /**
   * DB-transactional confirmation of a checkout's orders. Shared by the verify
   * flow and the webhook flow so both always agree on the state transitions.
   */
  private async confirmPayment(
    paymentId: number,
    providerPaymentId: string,
    providerPayment: any,
  ) {
    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId } });
      if (!payment) throw new NotFoundException('Payment record not found');

      const orders = await tx.order.findMany({
        where: { checkoutId: payment.checkoutId },
        include: { product: true },
      });
      const pendingOrders = orders.filter(
        (o) => o.paymentStatus !== 'Completed',
      );

      await tx.payment.update({
        where: { id: payment.id },
        data: {
          providerPaymentId,
          status: PAYMENT_STATUS.CAPTURED,
          signatureVerified: true,
          method: providerPayment?.method || payment.method,
          metadata: {
            ...((payment.metadata as any) || {}),
            provider: {
              method: providerPayment?.method || null,
              fee: providerPayment?.fee || null,
              tax: providerPayment?.tax || null,
            },
          } as any,
        },
      });

      for (const order of pendingOrders) {
        await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'Completed',
            paymentId: providerPaymentId,
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

      if (pendingOrders.length === 0) {
        this.logger.log(`Payment ${paymentId} already confirmed for checkout ${payment.checkoutId}`);
      }

      return pendingOrders.length > 0
        ? pendingOrders
        : tx.order.findMany({
            where: { checkoutId: payment.checkoutId },
            include: { product: true },
          });
    });
  }

  async processCodPayment(userId: number, checkoutId: string) {
    const payment = await this.prisma.payment.findFirst({
      where: { checkoutId },
    });
    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }
    await this.assertPaymentOwnership(userId, payment);

    const orders = await this.prisma.order.findMany({
      where: { checkoutId },
    });
    if (orders.length === 0) {
      throw new NotFoundException('No orders found');
    }

    if (payment.status === PAYMENT_STATUS.CAPTURED && payment.signatureVerified) {
      this.logger.log(`COD checkout ${checkoutId} already processed (idempotent)`);
      const refreshedOrders = await this.prisma.order.findMany({
        where: { checkoutId },
        include: { product: true },
      });
      return { success: true, message: 'Order already placed', orders: refreshedOrders };
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: PAYMENT_STATUS.CAPTURED, signatureVerified: true, method: 'cod' },
      });

      for (const order of orders) {
        await tx.order.update({
          where: { id: order.id },
          data: {
            paymentStatus: 'Pending',
            status: 'Processing',
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

    await this.cartService.clearCart(userId);

    const updatedOrders = await this.prisma.order.findMany({
      where: { checkoutId },
      include: { product: true },
    });

    for (const order of updatedOrders) {
      if (order.email) {
        await this.notifications.notifyOrderCreated({
          id: order.id,
          email: order.email,
          username: order.username || '',
          productName: order.name || '',
          price: Number(order.price || 0),
          quantity: order.quantity || 0,
          total: Number(order.totalAmount || 0),
          paymentMethod: 'COD',
        });
      }
    }

    this.logger.log(`COD checkout ${checkoutId} confirmed`);

    return {
      success: true,
      message: 'Order placed successfully (Cash on Delivery)',
      orders: updatedOrders,
    };
  }

  async retryPayment(userId: number, checkoutId: string): Promise<PaymentRetryResult> {
    const payment = await this.prisma.payment.findFirst({
      where: { checkoutId },
    });
    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }
    await this.assertPaymentOwnership(userId, payment);

    const orders = await this.prisma.order.findMany({
      where: { checkoutId },
    });
    if (orders.length === 0) {
      throw new NotFoundException('No orders found for this payment');
    }

    const nonRetryable = orders.some((o) =>
      ['Delivered', 'Cancelled', 'Refunded'].includes(o.status),
    );
    if (nonRetryable) {
      throw new BadRequestException('Cannot retry payment for this order');
    }

    if (payment.status === PAYMENT_STATUS.CAPTURED) {
      throw new BadRequestException('Payment already completed');
    }

    const attempt = (Number((payment.metadata as any)?.attempts) || 0) + 1;

    const razorpayOrder = await this.razorpay.createOrder(
      payment.amount,
      checkoutId,
    );

    await this.prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerOrderId: razorpayOrder.id,
        providerPaymentId: null,
        status: PAYMENT_STATUS.PENDING,
        signatureVerified: false,
        failureReason: null,
        metadata: { ...((payment.metadata as any) || {}), attempts: attempt } as any,
      },
    });

    this.logger.log(`Retry ${attempt} for checkout ${checkoutId}: new Razorpay order ${razorpayOrder.id}`);

    return {
      checkoutId,
      razorpayOrderId: razorpayOrder.id,
      amount: payment.amount,
      currency: payment.currency,
      keyId: this.razorpay.getKeyId(),
      attempt,
    };
  }

  async getPaymentStatus(userId: number, paymentId: number): Promise<PaymentStatusResult> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    await this.assertPaymentOwnership(userId, payment);

    const orders = await this.prisma.order.findMany({
      where: { checkoutId: payment.checkoutId },
    });

    return {
      id: payment.id,
      checkoutId: payment.checkoutId,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      createdAt: payment.createdAt,
      orders: orders.map((o) => ({
        id: o.id,
        name: o.name || '',
        status: o.status,
        paymentStatus: o.paymentStatus,
        subtotal: Number(o.subtotal || 0),
      })),
    };
  }

  async getPaymentByCheckout(userId: number, checkoutId: string): Promise<PaymentStatusResult> {
    const payment = await this.prisma.payment.findFirst({
      where: { checkoutId },
    });
    if (!payment) {
      throw new NotFoundException('Payment record not found');
    }
    await this.assertPaymentOwnership(userId, payment);

    const orders = await this.prisma.order.findMany({
      where: { checkoutId },
    });

    return {
      id: payment.id,
      checkoutId: payment.checkoutId,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      method: payment.method,
      createdAt: payment.createdAt,
      orders: orders.map((o) => ({
        id: o.id,
        name: o.name || '',
        status: o.status,
        paymentStatus: o.paymentStatus,
        subtotal: Number(o.subtotal || 0),
      })),
    };
  }

  /**
   * Admin-initiated refund for a captured payment. Amount is in currency units
   * (₹). Updates the payment status based on the total refunded amount.
   */
  async refundByPaymentId(
    adminUserId: number,
    paymentId: number,
    amount: number,
    reason?: string,
    _metadata?: Record<string, any>,
  ) {
    if (!amount || amount <= 0) {
      throw new BadRequestException('Refund amount must be a positive number');
    }

    const payment = await this.prisma.payment.findUnique({
      where: { id: paymentId },
    });
    if (!payment) {
      throw new NotFoundException('Payment not found');
    }
    if (payment.status !== PAYMENT_STATUS.CAPTURED) {
      throw new BadRequestException('Only captured payments can be refunded');
    }
    if (!payment.providerPaymentId) {
      throw new BadRequestException('Payment has no Razorpay payment ID');
    }

    const maxAmount = payment.amount / 100;
    if (amount > maxAmount) {
      throw new BadRequestException(
        `Refund amount (₹${amount}) exceeds payment amount (₹${maxAmount})`,
      );
    }

    const existingRefund = await this.prisma.refund.findFirst({
      where: {
        checkoutId: payment.checkoutId,
        status: { notIn: ['FAILED'] },
      },
    });
    if (existingRefund) {
      this.logger.log(`Refund already exists for checkout ${payment.checkoutId}: ${existingRefund.id}`);
      return existingRefund;
    }

    const orders = await this.prisma.order.findMany({
      where: { checkoutId: payment.checkoutId },
    });
    const refundUserId = payment.userId || orders[0]?.userId;
    if (!refundUserId) {
      throw new BadRequestException('Cannot determine refund recipient for this payment');
    }

    const refund = await this.prisma.refund.create({
      data: {
        checkoutId: payment.checkoutId,
        userId: refundUserId,
        amount,
        status: 'PENDING',
      },
    });

    for (const order of orders) {
      if (order.email) {
        await this.notifications.notifyRefundInitiated({
          id: order.id,
          email: order.email,
          username: order.username || '',
          amount,
        });
      }
    }

    try {
      await this.prisma.refund.update({
        where: { id: refund.id },
        data: { status: 'PROCESSING' },
      });

      const razorpayRefund = await this.razorpay.refundPayment(
        payment.providerPaymentId,
        amount * 100,
        { reason: reason || 'Admin refund' },
      );

      await this.prisma.$transaction(async (tx) => {
        await tx.refund.update({
          where: { id: refund.id },
          data: {
            status: 'COMPLETED',
            providerRefundId: razorpayRefund.id,
          },
        });

        const completedRefunds = await tx.refund.findMany({
          where: {
            checkoutId: payment.checkoutId,
            status: 'COMPLETED',
          },
        });
        const refundedTotal = completedRefunds.reduce(
          (sum, r) => sum + Number(r.amount || 0),
          0,
        );
        const paymentAmount = payment.amount / 100;

        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status:
              refundedTotal >= paymentAmount
                ? PAYMENT_STATUS.REFUNDED
                : PAYMENT_STATUS.PARTIALLY_REFUNDED,
          },
        });
      });

      for (const order of orders) {
        if (order.email) {
          await this.notifications.notifyRefundCompleted({
            id: order.id,
            email: order.email,
            username: order.username || '',
            amount,
          });
        }
      }

      this.logger.log(
        `Admin refund ${refund.id} completed (${razorpayRefund.id}) for payment ${payment.id}`,
      );

      return this.prisma.refund.findUnique({ where: { id: refund.id } });
    } catch (err: any) {
      this.logger.error(
        `Razorpay refund failed for refund ${refund.id}: ${err.message}`,
      );
      await this.prisma.refund.update({
        where: { id: refund.id },
        data: { status: 'FAILED', failureReason: err.message },
      });
      throw new BadRequestException(`Refund failed: ${err.message}`);
    }
  }

  async handleWebhook(event: string, payload: any): Promise<WebhookProcessResult> {
    return this.webhookService.processWebhook(event, payload);
  }

  /** Thin wrapper so the controller does not depend directly on the SDK service. */
  verifyWebhookSignatureSafe(body: string, signature: string): boolean {
    return this.razorpay.verifyWebhookSignature(body, signature);
  }

  async releaseCouponForCheckout(checkoutId: string) {
    const orders = await this.prisma.order.findMany({
      where: { checkoutId },
      select: { couponCode: true, userId: true },
    });
    const coupon = orders.find((o) => o.couponCode);
    if (coupon?.couponCode && coupon.userId) {
      try {
        await this.couponsService.releaseCoupon(coupon.couponCode, coupon.userId);
      } catch (err: any) {
        this.logger.warn(`Failed to release coupon ${coupon.couponCode}: ${err.message}`);
      }
    }
  }

  private async assertPaymentOwnership(
    userId: number,
    payment: { id: number; checkoutId: string; userId: number | null },
  ) {
    if (payment.userId && payment.userId !== userId) {
      throw new ForbiddenException('Payment does not belong to this user');
    }
    if (!payment.userId) {
      const order = await this.prisma.order.findFirst({
        where: { checkoutId: payment.checkoutId },
        select: { userId: true },
      });
      if (!order || order.userId !== userId) {
        throw new ForbiddenException('Payment does not belong to this user');
      }
    }
  }

  private getSizeField(size: string): string {
    const sizeMap: Record<string, string> = {
      small: 'sizeS',
      medium: 'sizeM',
      large: 'sizeL',
      xl: 'sizeXl',
      xxl: 'sizeXxl',
      s: 'sizeS',
      m: 'sizeM',
      l: 'sizeL',
    };
    const field = sizeMap[size.toLowerCase()];
    if (!field) {
      throw new BadRequestException(`Invalid size: ${size}`);
    }
    return field;
  }
}