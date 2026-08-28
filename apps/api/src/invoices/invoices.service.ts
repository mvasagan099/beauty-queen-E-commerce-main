import { Injectable, NotFoundException, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { InvoiceNumberService, InvoiceNumberConfig } from './invoice-generator.service';
import { AuditService } from '../audit/audit.service';

export interface GenerateInvoiceOptions {
  orderId: number;
  requestedBy: { sub: number; email: string };
  isAdmin?: boolean;
  numberConfig?: Partial<InvoiceNumberConfig>;
}

export interface InvoiceDataResult {
  invoiceNumber: string;
  orderId: number;
  invoice: any;
  items: any[];
}

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    private prisma: PrismaService,
    private invoiceNumberService: InvoiceNumberService,
    private auditService: AuditService,
  ) {}

  /**
   * Generates (or returns an existing) invoice for an order built from the
   * historical order snapshot. Never fetches current product prices for past
   * orders. The order snapshot itself is the source of truth.
   */
  async generateForOrder(options: GenerateInvoiceOptions): Promise<InvoiceDataResult> {
    const order = await this.prisma.order.findUnique({
      where: { id: options.orderId },
      include: { product: true, statusHistory: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const ownsByUserId = order.userId != null && order.userId === options.requestedBy.sub;
    const ownsByEmail =
      order.email != null &&
      order.email.toLowerCase() === options.requestedBy.email.toLowerCase();
    if (!options.isAdmin && !ownsByUserId && !ownsByEmail) {
      throw new NotFoundException('Order not found');
    }

    // Only generate invoices for orders that reached an invoiced/confirmed
    // state. Cancelled orders without payment are not invoiced.
    if (order.status === 'Cancelled' && order.paymentStatus !== 'Completed') {
      throw new ConflictException('Invoice is not available for this order');
    }

    const existing = await this.prisma.invoice.findFirst({
      where: { orderId: order.id },
    });
    if (existing) {
      return this.toResult(existing, order);
    }

    const invoice = await this.prisma.$transaction(async (tx) => {
      const invoiceNumber = await this.invoiceNumberService.nextInvoiceNumber(tx, options.numberConfig);

      const items = [
        {
          name: order.name || 'Product',
          size: order.size || null,
          quantity: order.quantity || 0,
          unitPrice: Number(order.price || 0),
          subtotal: Number(order.subtotal || 0),
          discount: Number(order.discountAmount || 0),
        },
      ];

      return tx.invoice.create({
        data: {
          invoiceNumber,
          orderId: order.id,
          userId: order.userId ?? 0,
          subtotal: order.subtotal || 0,
          discountAmount: order.discountAmount || 0,
          couponCode: order.couponCode || null,
          couponDiscount: order.couponDiscount || 0,
          shippingAmount: order.shippingAmount || 0,
          taxAmount: order.taxAmount || 0,
          totalAmount: order.totalAmount || 0,
          currency: 'INR',
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          items: items as any,
          recipientName: order.username,
          recipientEmail: order.email,
          billingAddress: {
            address: order.address,
            pincode: order.pincode,
            district: order.district,
            landmark: order.landmark,
          } as any,
        },
      });
    });

    await this.auditService.log({
      action: 'INVOICE_GENERATED',
      entityType: 'Invoice',
      entityId: invoice.id,
      details: { orderId: order.id, invoiceNumber: invoice.invoiceNumber },
    });

    this.logger.log(`Invoice ${invoice.invoiceNumber} generated for order ${order.id}`);
    return this.toResult(invoice, order);
  }

  async getForOrder(orderId: number, user: { sub: number; email: string }, isAdmin = false) {
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    const ownsByUserId = order.userId != null && order.userId === user.sub;
    const ownsByEmail =
      order.email != null &&
      order.email.toLowerCase() === user.email.toLowerCase();
    if (!isAdmin && !ownsByUserId && !ownsByEmail) {
      throw new NotFoundException('Order not found');
    }
    const invoice = await this.prisma.invoice.findFirst({ where: { orderId } });
    if (!invoice) {
      throw new NotFoundException('Invoice not generated for this order');
    }
    return invoice;
  }

  async getMyInvoices(userId: number) {
    return this.prisma.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getAllInvoices() {
    return this.prisma.invoice.findMany({
      include: {
        order: { select: { id: true, username: true, email: true } },
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  private toResult(invoice: any, order: any, mapItems?: (items: any[]) => any[]) {
    let items = invoice.items || [];
    if (mapItems) items = mapItems(items);
    return {
      invoiceNumber: invoice.invoiceNumber,
      orderId: invoice.orderId,
      invoice: { ...invoice, items },
      items,
      order: {
        id: order.id,
        orderDate: order.orderDate,
        username: order.username,
        email: order.email,
      },
    };
  }
}
