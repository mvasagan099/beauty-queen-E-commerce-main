import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RazorpayService } from '../payments/razorpay.service';

@Injectable()
export class RefundsService {
  private readonly logger = new Logger(RefundsService.name);

  constructor(
    private prisma: PrismaService,
    private razorpay: RazorpayService,
  ) {}

  async createRefund(userId: number, checkoutId: string, amount: number, returnRequestId?: number) {
    const existingRefund = await this.prisma.refund.findFirst({
      where: {
        checkoutId,
        userId,
        status: { notIn: ['FAILED'] },
      },
    });
    if (existingRefund) {
      this.logger.log(`Refund already exists for checkout ${checkoutId}: ${existingRefund.id}`);
      return existingRefund;
    }

    const payment = await this.prisma.payment.findFirst({
      where: { checkoutId, status: 'CAPTURED' },
    });
    if (!payment) {
      throw new BadRequestException('No successful payment found for this checkout');
    }

    if (amount > payment.amount / 100) {
      throw new BadRequestException(
        `Refund amount (₹${amount}) exceeds payment amount (₹${payment.amount / 100})`,
      );
    }

    const refund = await this.prisma.refund.create({
      data: {
        checkoutId,
        userId,
        amount,
        returnRequestId: returnRequestId || null,
        status: 'PENDING',
      },
    });

    this.logger.log(`Refund ${refund.id} created for checkout ${checkoutId}: ₹${amount}`);

    try {
      await this.processRazorpayRefund(refund.id, payment.providerPaymentId!, amount);
    } catch (error: any) {
      this.logger.error(`Razorpay refund failed for refund ${refund.id}: ${error.message}`);
      await this.prisma.refund.update({
        where: { id: refund.id },
        data: { status: 'FAILED', failureReason: error.message },
      });
    }

    return this.prisma.refund.findUnique({ where: { id: refund.id } });
  }

  private async processRazorpayRefund(refundId: number, paymentId: string, amount: number) {
    await this.prisma.refund.update({
      where: { id: refundId },
      data: { status: 'PROCESSING' },
    });

    const amountInPaise = amount * 100;

    const razorpay = await (this.razorpay as any).getRazorpayInstance();
    const razorpayRefund = await razorpay.payments.refund(paymentId, {
      amount: amountInPaise,
      speed: 'normal',
    });

    await this.prisma.refund.update({
      where: { id: refundId },
      data: {
        status: 'COMPLETED',
        providerRefundId: razorpayRefund.id,
      },
    });

    this.logger.log(`Razorpay refund completed: ${razorpayRefund.id} for refund ${refundId}`);
  }

  async getMyRefunds(userId: number) {
    return this.prisma.refund.findMany({
      where: { userId },
      include: { returnRequest: { include: { order: { include: { product: true } } } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getRefundById(id: number, userId?: number) {
    const where: any = { id };
    if (userId) where.userId = userId;

    const refund = await this.prisma.refund.findFirst({
      where,
      include: { returnRequest: { include: { order: { include: { product: true } } } } },
    });
    if (!refund) {
      throw new NotFoundException('Refund not found');
    }
    return refund;
  }

  async getAllRefunds(filters?: { status?: string; search?: string }) {
    const where: any = {};
    if (filters?.status) where.status = filters.status;

    return this.prisma.refund.findMany({
      where,
      include: {
        returnRequest: { include: { order: { include: { product: true } } } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}
