import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/types/audit.types';
import { Role } from '@prisma/client';

@Injectable()
export class AdminService {
  private readonly logger = new Logger(AdminService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  async getDashboard() {
    const [totalUsers, totalOrders, totalProducts, totalSellers, pendingOrders, revenue, statusGroups, paymentGroups, lowStockCount, cancelledOrders, deliveredOrders, returnRequests, pendingRefundAgg, refundedAgg, shippedCount] =
      await Promise.all([
        this.prisma.user.count(),
        this.prisma.order.count(),
        this.prisma.product.count({ where: { deletedAt: null } }),
        this.prisma.seller.count(),
        this.prisma.order.count({ where: { status: 'Pending' } }),
        this.prisma.order.aggregate({
          _sum: { subtotal: true },
          where: { paymentStatus: 'Completed' },
        }),
        this.prisma.order.groupBy({
          by: ['status'],
          _count: { _all: true },
        }),
        this.prisma.order.groupBy({
          by: ['paymentStatus'],
          _count: { _all: true },
        }),
        this.prisma.product.count({
          where: {
            deletedAt: null,
            OR: [
              { sizeS: { lte: 0 } },
              { sizeM: { lte: 0 } },
              { sizeL: { lte: 0 } },
              { sizeXl: { lte: 0 } },
              { sizeXxl: { lte: 0 } },
              { quantity: { lte: 0 } },
            ],
          },
        }),
        this.prisma.order.count({ where: { status: 'Cancelled' } }),
        this.prisma.order.count({ where: { status: 'Delivered' } }),
        this.prisma.returnRequest.count(),
        this.prisma.refund.aggregate({
          _count: { _all: true },
          _sum: { amount: true },
          where: { status: { in: ['PENDING', 'PROCESSING'] } },
        }),
        this.prisma.refund.aggregate({
          _sum: { amount: true },
          where: { status: 'COMPLETED' },
        }),
        this.prisma.order.count({ where: { trackingNumber: { not: null } } }),
      ]);

    return {
      totalUsers,
      totalOrders,
      totalProducts,
      totalSellers,
      pendingOrders,
      cancelledOrders,
      deliveredOrders,
      returnRequests,
      pendingRefunds: pendingRefundAgg._count._all,
      pendingRefundAmount: pendingRefundAgg._sum.amount || 0,
      refundedAmount: refundedAgg._sum.amount || 0,
      shippedCount,
      totalRevenue: revenue._sum.subtotal || 0,
      paidOrders:
        paymentGroups.find((g) => g.paymentStatus === 'Completed')?._count._all || 0,
      failedPayments:
        paymentGroups.find((g) => g.paymentStatus === 'Failed')?._count._all || 0,
      lowStockProducts: lowStockCount,
      orderStatus: Object.fromEntries(
        statusGroups.map((g) => [g.status, g._count._all]),
      ),
      paymentStatus: Object.fromEntries(
        paymentGroups.map((g) => [g.paymentStatus, g._count._all]),
      ),
    };
  }

  async getAllSellers() {
    const sellers = await this.prisma.seller.findMany({
      select: {
        id: true,
        sellername: true,
        mobile: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { id: 'desc' },
    });
    return sellers;
  }

  async getSeller(id: number) {
    const seller = await this.prisma.seller.findUnique({
      where: { id },
      select: {
        id: true,
        sellername: true,
        mobile: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
    });
    if (!seller) {
      throw new NotFoundException('Seller not found');
    }
    return seller;
  }

  async updateSellerStatus(id: number, isActive: boolean) {
    const seller = await this.prisma.seller.findUnique({ where: { id } });
    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    const updated = await this.prisma.seller.update({
      where: { id },
      data: { isActive },
      select: { id: true, sellername: true, email: true, isActive: true },
    });

    await this.auditService.log({
      action: AuditAction.SELLER_STATUS_CHANGED,
      entityType: 'Seller',
      entityId: id,
      details: { sellername: seller.sellername, isActive },
    });

    this.logger.log(`Seller ${id} status updated to ${isActive ? 'active' : 'inactive'}`);
    return { success: true, message: 'Seller status updated', seller: updated };
  }

  async updateSellerRole(userId: number, role: Role) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });

    await this.auditService.log({
      action: AuditAction.USER_ROLE_CHANGED,
      entityType: 'User',
      entityId: userId,
      details: { email: user.email, oldRole: user.role, newRole: role },
    });

    this.logger.log(`User ${userId} role updated to ${role}`);
    return { success: true, message: 'Role updated', user: updated };
  }

  async getAllProducts(filters?: { page?: number; limit?: number; search?: string; category?: string; status?: string }) {
    const page = Math.max(1, Math.floor(Number(filters?.page) || 1));
    const limit = Math.min(100, Math.max(1, Math.floor(Number(filters?.limit) || 20)));

    const where: any = {};
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { ptype: { contains: filters.search } },
        { description: { contains: filters.search } },
      ];
    }
    if (filters?.category) {
      where.ptype = filters.category;
    }
    if (filters?.status === 'active') {
      where.deletedAt = null;
    } else if (filters?.status === 'deleted') {
      where.deletedAt = { not: null };
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { id: 'desc' },
        include: {
          _count: { select: { orderItems: true, reviews: true } },
        },
        take: limit,
        skip: (page - 1) * limit,
      }),
      this.prisma.product.count({ where }),
    ]);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getAllOrders(filters?: { status?: string; search?: string }) {
    const where: any = {};
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.search) {
      where.OR = [
        { username: { contains: filters.search } },
        { email: { contains: filters.search } },
        { name: { contains: filters.search } },
      ];
    }

    return this.prisma.order.findMany({
      where,
      include: { product: true },
      orderBy: { orderDate: 'desc' },
    });
  }

  async getAllUsers() {
    return this.prisma.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
        _count: { select: { orders: true, cartItems: true } },
      },
      orderBy: { id: 'desc' },
    });
  }

  async getUser(id: number) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        role: true,
        createdAt: true,
        _count: { select: { orders: true, cartItems: true, addresses: true } },
      },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async updateUserStatus(id: number, role: Role) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, email: true, name: true, role: true },
    });

    await this.auditService.log({
      action: AuditAction.USER_STATUS_CHANGED,
      entityType: 'User',
      entityId: id,
      details: { email: user.email, oldRole: user.role, newRole: role },
    });

    this.logger.log(`User ${id} role updated to ${role}`);
    return { success: true, message: 'User updated', user: updated };
  }
}
