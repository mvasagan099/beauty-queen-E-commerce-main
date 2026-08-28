import { Injectable, NotFoundException, BadRequestException, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { CreateOrderDto } from './dto/order.dto';
import { OrderStatus, PaymentStatus } from '@prisma/client';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/types/audit.types';
import { OrderStatusService } from './order-status.service';
import { OrderQueryService, OrderQueryFilters } from './order-query.service';
import { RefundsService } from '../refunds/refunds.service';

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private productsService: ProductsService,
    private notificationsService: NotificationsService,
    private auditService: AuditService,
    private orderStatusService: OrderStatusService,
    private orderQueryService: OrderQueryService,
    private refundsService: RefundsService,
  ) {}

  async getOrdersByUser(user: { sub: number; email: string }) {
    return this.prisma.order.findMany({
      where: {
        OR: [
          { userId: user.sub },
          { email: user.email },
        ],
      },
      include: { product: true },
      orderBy: { orderDate: 'desc' },
    });
  }

  async getAllOrders(filters: OrderQueryFilters = {}) {
    const where = this.orderQueryService.buildWhere(filters);
    const include = { product: true, seller: true } as any;
    return this.orderQueryService.paginate(where, filters, include);
  }

  async getOrderById(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: { product: true, statusHistory: true, events: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async getCustomerOrder(id: number, user: { sub: number; email: string }) {
    const order = await this.getOrderById(id);
    const ownsByUserId = order.userId != null && order.userId === user.sub;
    const ownsByEmail =
      order.email != null &&
      order.email.toLowerCase() === user.email.toLowerCase();
    if (!ownsByUserId && !ownsByEmail) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  // ------------------------------------------------------------------
  // Order status lifecycle
  // ------------------------------------------------------------------

  async createOrder(dto: CreateOrderDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const availableQty = await this.productsService.getAvailableSizeQty(product, dto.size);
    if (availableQty < dto.quantity) {
      throw new BadRequestException(`Insufficient stock for ${dto.size}. Available: ${availableQty}`);
    }

    const price = product.price || 0;
    const subtotal = price * dto.quantity;
    const sizeField = this.getSizeField(dto.size);

    const order = await this.prisma.$transaction(async (tx) => {
      const sizeQty = await tx.product.findUnique({
        where: { id: dto.productId },
        select: { [sizeField]: true },
      });
      const currentQty = (sizeQty as any)?.[sizeField] || 0;
      if (currentQty < dto.quantity) {
        throw new BadRequestException(`Insufficient stock for ${dto.size}. Available: ${currentQty}`);
      }

      await tx.product.update({
        where: { id: dto.productId },
        data: { [sizeField]: { decrement: dto.quantity } },
      });

      const newOrder = await tx.order.create({
        data: {
          productId: dto.productId,
          sellerId: product.sellerId,
          name: product.name,
          size: dto.size,
          price,
          quantity: dto.quantity,
          subtotal,
          username: dto.username,
          email: dto.email,
          address: dto.address,
          pincode: dto.pincode,
          district: dto.district,
          landmark: dto.landmark,
          paymentMethod: dto.paymentMethod,
          paymentId: dto.paymentId,
          paymentStatus: 'Pending',
          status: 'Pending',
        },
        include: { product: true },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: newOrder.id,
          oldStatus: null,
          newStatus: 'Pending',
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId: newOrder.id,
          type: 'ORDER_CREATED',
          message: 'Order placed',
          actor: 'CUSTOMER',
        },
      });

      return newOrder;
    });

    this.logger.log(`Order ${order.id} created for ${dto.email}`);
    return order;
  }

  /**
   * Update order status with centralized transition validation, status
   * history + audit event recording and status notifications.
   */
  async updateOrderStatus(id: number, status: OrderStatus, changedBy?: number, actorRole = 'ADMIN') {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === status) {
      this.logger.log(`Order ${id} already in ${status} (no-op)`);
      return order;
    }

    this.orderStatusService.assertValidTransition(order.status, status);

    const updated = await this.prisma.$transaction(async (tx) => {
      const data: any = { status };
      if (status === OrderStatus.Shipped && !order.shippedAt) data.shippedAt = new Date();
      if (status === OrderStatus.Delivered && !order.deliveredAt) data.deliveredAt = new Date();

      const updatedOrder = await tx.order.update({
        where: { id },
        data,
        include: { product: true },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          oldStatus: order.status,
          newStatus: status,
          changedBy: changedBy || null,
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId: id,
          type: `ORDER_${status.toUpperCase().replace('_', '')}`,
          message: `Order status changed from ${order.status} to ${status}`,
          actor: actorRole,
        },
      });

      return updatedOrder;
    });

    this.logger.log(`Order ${id} status updated to ${status}`);

    await this.notificationsService.notifyOrderStatusChanged({
      id: updated.id,
      email: updated.email || '',
      username: updated.username || 'Customer',
      productName: updated.name || 'Product',
      oldStatus: order.status,
      newStatus: status,
      carrier: updated.carrier || undefined,
      trackingNumber: updated.trackingNumber || undefined,
      trackingUrl: updated.trackingUrl || undefined,
    });

    await this.auditService.log({
      action: AuditAction.ORDER_STATUS_CHANGED,
      entityType: 'Order',
      entityId: id,
      actorId: changedBy,
      actorRole,
      details: { oldStatus: order.status, newStatus: status },
    });

    return updated;
  }

  // ------------------------------------------------------------------
  // Customer cancellation
  // ------------------------------------------------------------------

  /**
   * Customer-initiated cancellation.
   *
   * Validates: order ownership, cancellability (status before fulfilment),
   * payment state. Restores inventory transactionally and, when the order was
   * already paid for, initiates a refund request (never marks the payment as
   * refunded before the provider confirms).
   *
   * Idempotent: repeating a cancellation on an already-cancelled order is a
   * safe no-op and never restores inventory twice.
   */
  async cancelOrder(id: number, userId: number, reason?: string) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (order.userId !== userId) {
      throw new NotFoundException('Order not found');
    }

    if (order.status === OrderStatus.Cancelled) {
      this.logger.log(`Order ${id} already cancelled (idempotent)`);
      return { order, alreadyCancelled: true };
    }

    if (!this.orderStatusService.isCustomerCancellable(order.status)) {
      throw new ConflictException(
        `Order cannot be cancelled at status: ${order.status}`,
      );
    }

    const sizeField = this.getSizeField(order.size || '');
    const restored = await this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id },
        data: {
          status: OrderStatus.Cancelled,
          paymentStatus:
            order.paymentStatus === PaymentStatus.Completed
              ? (order.paymentStatus as any)
              : order.paymentStatus,
        },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId: id,
          oldStatus: order.status,
          newStatus: OrderStatus.Cancelled,
          changedBy: userId,
          note: reason || null,
        },
      });

      await tx.orderEvent.create({
        data: {
          orderId: id,
          type: 'ORDER_CANCELLED',
          message: reason ? `Order cancelled: ${reason}` : 'Order cancelled',
          actor: 'CUSTOMER',
        },
      });

      // Restore inventory (idempotent: order is now Cancelled so a repeat
      // request short-circuits above and never reaches here twice).
      await tx.product.update({
        where: { id: order.productId },
        data: { [sizeField]: { increment: order.quantity || 0 } },
      });

      return updatedOrder;
    });

    // Notify (async via BullMQ, does not block) and audit.
    await this.notificationsService.notifyOrderCancelled({
      id: restored.id,
      email: restored.email || '',
      username: restored.username || 'Customer',
      productName: restored.name || 'Product',
      reason,
    });

    await this.auditService.log({
      action: 'ORDER_CANCELLED',
      entityType: 'Order',
      entityId: id,
      actorId: userId,
      actorRole: 'CUSTOMER',
      details: { reason, restoredInventory: { field: sizeField, qty: order.quantity } },
    });

    // If the order was already paid for, initiate a refund request. This does
    // not manually mark the payment refunded — the provider must confirm.
    let refund = null;
    if (restored.paymentStatus === PaymentStatus.Completed) {
      try {
        refund = await this.refundsService.createRefund(
          userId,
          order.checkoutId!,
          Number(order.totalAmount || 0),
        );
      } catch (err: any) {
        this.logger.warn(`Refund initiation for cancelled order ${id} failed: ${err.message}`);
      }
    }

    this.logger.log(`Order ${id} cancelled by customer ${userId}`);
    return { order: restored, refund };
  }

  // ------------------------------------------------------------------
  // Tracking
  // ------------------------------------------------------------------

  /**
   * Customer-facing tracking endpoint. Only returns information that has
   * actually been recorded — never fabricated tracking events.
   */
  async getTracking(id: number, user: { sub: number; email: string }) {
    const order = await this.getOrderById(id);

    const ownsByUserId = order.userId != null && order.userId === user.sub;
    const ownsByEmail =
      order.email != null &&
      order.email.toLowerCase() === user.email.toLowerCase();
    if (!ownsByUserId && !ownsByEmail) {
      throw new NotFoundException('Order not found');
    }

    const hasTracking =
      Boolean(order.trackingNumber) || Boolean(order.carrier) || Boolean(order.trackingUrl);

    return {
      orderId: order.id,
      status: order.status,
      carrier: order.carrier || null,
      trackingNumber: order.trackingNumber || null,
      trackingUrl: order.trackingUrl || null,
      shippingStatus: order.shippingStatus || null,
      shippedAt: order.shippedAt,
      deliveredAt: order.deliveredAt,
      orderDate: order.orderDate,
      hasTracking,
      // Actual, recorded lifecycle events only.
      events: [
        ...(order.statusHistory || []).map((h) => ({
          status: h.newStatus,
          note: h.note,
          at: h.changedAt,
        })),
        ...(order.events || []).map((e) => ({
          type: e.type,
          message: e.message,
          at: e.createdAt,
        })),
      ].sort((a, b) => new Date(a.at).getTime() - new Date(b.at).getTime()),
    };
  }

  // ------------------------------------------------------------------
  // Admin / seller management
  // ------------------------------------------------------------------

  async deleteOrder(id: number) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    await this.prisma.orderStatusHistory.deleteMany({ where: { orderId: id } });
    await this.prisma.order.delete({ where: { id } });

    await this.auditService.log({
      action: AuditAction.ORDER_DELETED,
      entityType: 'Order',
      entityId: id,
      details: { email: order.email, status: order.status },
    });

    this.logger.log(`Order ${id} deleted`);
    return { success: true, message: 'Order deleted' };
  }

  async getStatusHistory(
    id: number,
    user?: { sub: number; email: string },
  ) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (user) {
      const ownsByUserId = order.userId != null && order.userId === user.sub;
      const ownsByEmail =
        order.email != null &&
        order.email.toLowerCase() === user.email.toLowerCase();
      if (!ownsByUserId && !ownsByEmail) {
        throw new NotFoundException('Order not found');
      }
    }
    return this.prisma.orderStatusHistory.findMany({
      where: { orderId: id },
      orderBy: { changedAt: 'desc' },
    });
  }

  async getOrderEvents(id: number) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return this.prisma.orderEvent.findMany({
      where: { orderId: id },
      orderBy: { createdAt: 'asc' },
    });
  }

  async getDashboard() {
    const [
      totalOrders,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue,
      returnRequests,
      pendingRefunds,
      refundAmount,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { status: 'Pending' } }),
      this.prisma.order.count({ where: { status: 'Delivered' } }),
      this.prisma.order.count({ where: { status: 'Cancelled' } }),
      this.prisma.order.aggregate({
        _sum: { subtotal: true },
        where: { paymentStatus: 'Completed' },
      }),
      this.prisma.returnRequest.count(),
      this.prisma.refund.aggregate({
        _count: { _all: true },
        _sum: { amount: true },
        where: { status: { in: ['PENDING', 'PROCESSING'] } },
      }),
      this.prisma.refund.aggregate({
        _sum: { amount: true },
        where: { status: { in: ['PENDING', 'PROCESSING'] } },
      }),
    ]);

    return {
      totalOrders,
      pendingOrders,
      deliveredOrders,
      cancelledOrders,
      returnRequests,
      pendingRefunds: pendingRefunds._count._all,
      pendingRefundAmount: pendingRefunds._sum.amount || 0,
      refundedAmount: refundAmount._sum.amount || 0,
      totalRevenue: totalRevenue._sum.subtotal || 0,
    };
  }

  async getSellerOrders(sellerId: number, filters: OrderQueryFilters = {}) {
    const where = this.orderQueryService.buildWhere({ ...filters, sellerId });
    const include = { product: true } as any;
    return this.orderQueryService.paginate(where, filters, include);
  }

  async getSellerOrder(id: number, sellerId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id, sellerId },
      include: { product: true, statusHistory: true, events: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return order;
  }

  async updateOrderStatusBySeller(id: number, status: OrderStatus, sellerId: number) {
    const order = await this.prisma.order.findUnique({ where: { id } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.sellerId !== sellerId) {
      throw new BadRequestException('Not authorized');
    }
    return this.updateOrderStatus(id, status, sellerId, 'SELLER');
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
