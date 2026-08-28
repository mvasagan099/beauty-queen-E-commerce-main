import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AnalyticsQueryDto, DateRange } from './dto/analytics-query.dto';
import { PaymentStatus, OrderStatus } from '@prisma/client';

/**
 * Centralized inventory low-stock threshold.
 * Stored in SiteConfig (`lowStockThreshold`) so it can be changed
 * without code changes. Defaults to 5 when unset.
 */
export const LOW_STOCK_THRESHOLD_KEY = 'lowStockThreshold';
export const DEFAULT_LOW_STOCK_THRESHOLD = 5;

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(private prisma: PrismaService) {}

  /**
   * Resolve a date filter (inclusive of the whole `to` day) from the query.
   * Returns undefined bounds when no range constraint applies.
   */
  async buildDateFilter(query: AnalyticsQueryDto): Promise<{ from?: Date; to?: Date }> {
    const range: DateRange = query.range || '30d';
    if (range === 'custom') {
      if (!query.from || !query.to) {
        throw new BadRequestException('Both from and to (YYYY-MM-DD) are required for custom range');
      }
      const from = new Date(`${query.from}T00:00:00`);
      const to = new Date(`${query.to}T23:59:59`);
      if (isNaN(from.getTime()) || isNaN(to.getTime())) {
        throw new BadRequestException('Invalid date range');
      }
      return { from, to };
    }

    const now = new Date();
    const to = now;
    let from: Date | undefined;

    switch (range) {
      case 'today':
        from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        break;
      case '7d':
        from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        from = new Date(now.getFullYear(), now.getMonth(), 1);
        break;
      case '30d':
        from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      case '90d':
        from = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
        break;
      default:
        from = undefined;
    }
    return { from, to };
  }

  private countBy(groups: { [key: string]: any }[], key: string, statuses: string[]) {
    const counts = Object.fromEntries(groups.map((g) => [g[key], g._count._all]));
    const result: Record<string, number> = {};
    for (const s of statuses) result[s] = counts[s] || 0;
    return result;
  }

  private async getLowStockThreshold(): Promise<number> {
    const config = await this.prisma.siteConfig.findUnique({
      where: { key: LOW_STOCK_THRESHOLD_KEY },
    });
    const value = config?.value as any;
    if (value != null) {
      const t = typeof value === 'number' ? value : value?.threshold;
      if (typeof t === 'number' && t >= 0) return t;
    }
    return DEFAULT_LOW_STOCK_THRESHOLD;
  }

  private totalProductStock(p: {
    sizeS?: number | null;
    sizeM?: number | null;
    sizeL?: number | null;
    sizeXl?: number | null;
    sizeXxl?: number | null;
    quantity?: number | null;
  }): number {
    return (
      (p.sizeS || 0) +
      (p.sizeM || 0) +
      (p.sizeL || 0) +
      (p.sizeXl || 0) +
      (p.sizeXxl || 0) +
      (p.quantity || 0)
    );
  }

  private async inventorySummary(
    where: { sellerId?: number; deletedAt: null },
    threshold: number,
  ) {
    const products = await this.prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        ptype: true,
        price: true,
        image: true,
        sizeS: true,
        sizeM: true,
        sizeL: true,
        sizeXl: true,
        sizeXxl: true,
        quantity: true,
      },
    });

    let total = 0;
    let lowStock = 0;
    let outOfStock = 0;
    const lowStockList: { id: number; name: string; stock: number }[] = [];
    const outOfStockList: { id: number; name: string }[] = [];

    for (const p of products) {
      const stock = this.totalProductStock(p);
      total += 1;
      if (stock === 0) {
        outOfStock += 1;
        outOfStockList.push({ id: p.id, name: p.name || `Product #${p.id}` });
      } else if (stock <= threshold) {
        lowStock += 1;
        lowStockList.push({ id: p.id, name: p.name || `Product #${p.id}`, stock });
      }
    }

    return { total, lowStock, outOfStock, lowStockList, outOfStockList, products };
  }

  private orderWhere(
    filter?: { from?: Date; to?: Date },
    extra: Record<string, unknown> = {},
  ) {
    const where: any = { ...extra };
    if (filter?.from) {
      where.orderDate = { gte: filter.from, lte: filter.to };
    }
    return where;
  }

  /* ------------------------------------------------------------------ */
  /*  Admin metrics                                                     */
  /* ------------------------------------------------------------------ */

  async getAdminOverview(query: AnalyticsQueryDto) {
    const filter = await this.buildDateFilter(query);
    const statuses = Object.values(OrderStatus);
    const paymentStatuses = Object.values(PaymentStatus);
    const where = this.orderWhere(filter);

    const threshold = await this.getLowStockThreshold();
    const inv = await this.inventorySummary({ deletedAt: null }, threshold);

    const [
      orderCount,
      orderCountFiltered,
      statusGroups,
      paymentGroups,
      revenueAgg,
      totalCustomers,
      totalSellers,
    ] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where }),
      this.prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
      this.prisma.order.groupBy({ by: ['paymentStatus'], _count: { _all: true } }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { paymentStatus: PaymentStatus.Completed },
      }),
      this.prisma.user.count(),
      this.prisma.seller.count(),
    ]);

    return {
      range: query.range || '30d',
      revenue: revenueAgg._sum.totalAmount || 0,
      orders: {
        total: orderCount,
        filtered: orderCountFiltered,
        byStatus: this.countBy(statusGroups, 'status', statuses),
        byPayment: this.countBy(paymentGroups, 'paymentStatus', paymentStatuses),
      },
      products: {
        total: inv.total,
        lowStock: inv.lowStock,
        outOfStock: inv.outOfStock,
        lowStockThreshold: threshold,
      },
      customers: totalCustomers,
      sellers: totalSellers,
    };
  }

  async getAdminSales(query: AnalyticsQueryDto) {
    const filter = await this.buildDateFilter(query);
    const where = this.orderWhere(filter);

    const [orders, revenueAgg, productsSoldAgg, payments] = await Promise.all([
      this.prisma.order.findMany({
        where,
        select: { totalAmount: true, paymentStatus: true },
      }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { ...where, paymentStatus: PaymentStatus.Completed },
      }),
      this.prisma.order.aggregate({
        _sum: { quantity: true },
        where: { ...where, paymentStatus: PaymentStatus.Completed },
      }),
      this.prisma.payment.groupBy({
        by: ['status'],
        _count: { _all: true },
        _sum: { amount: true },
        where: filter?.from
          ? { createdAt: { gte: filter.from, lte: filter.to } }
          : undefined,
      }),
    ]);

    const revenue = Number(revenueAgg._sum.totalAmount || 0);
    const totalOrders = orders.length;
    const averageOrderValue = totalOrders > 0 ? revenue / totalOrders : 0;

    const paymentBreakdown: Record<string, { count: number; amount: number }> = {};
    for (const p of payments) {
      paymentBreakdown[p.status] = {
        count: p._count._all,
        amount: p._sum.amount || 0,
      };
    }

    return {
      range: query.range || '30d',
      revenue,
      orders: totalOrders,
      averageOrderValue: Number(averageOrderValue.toFixed(2)),
      productsSold: productsSoldAgg._sum.quantity || 0,
      payments: paymentBreakdown,
    };
  }

  async getAdminOrders(query: AnalyticsQueryDto) {
    const filter = await this.buildDateFilter(query);
    const where = this.orderWhere(filter);
    const groups = await this.prisma.order.groupBy({
      by: ['status'],
      _count: { _all: true },
      where,
    });
    return {
      range: query.range || '30d',
      total: groups.reduce((acc, g) => acc + g._count._all, 0),
      byStatus: this.countBy(groups, 'status', Object.values(OrderStatus)),
    };
  }

  async getAdminProducts(query: AnalyticsQueryDto) {
    const filter = await this.buildDateFilter(query);
    const threshold = await this.getLowStockThreshold();
    const inv = await this.inventorySummary({ deletedAt: null }, threshold);

    const [topSelling, categoryGroups] = await Promise.all([
      this.prisma.order.groupBy({
        by: ['productId'],
        where: {
          ...this.orderWhere(filter),
          paymentStatus: PaymentStatus.Completed,
        },
        _sum: { quantity: true },
        orderBy: { _sum: { quantity: 'desc' } },
        take: 10,
      }),
      this.prisma.product.groupBy({
        by: ['ptype'],
        _count: { _all: true },
        where: { deletedAt: null },
      }),
    ]);

    const topSellingProducts = [];
    for (const t of topSelling) {
      const product = await this.prisma.product.findUnique({
        where: { id: t.productId },
        select: { id: true, name: true, ptype: true, price: true, image: true },
      });
      if (product) {
        topSellingProducts.push({ product, unitsSold: t._sum.quantity || 0 });
      }
    }

    return {
      range: query.range || '30d',
      total: inv.total,
      lowStockThreshold: threshold,
      topSelling: topSellingProducts,
      lowStock: inv.lowStockList,
      outOfStock: inv.outOfStockList,
      byCategory: categoryGroups.map((g) => ({
        category: g.ptype || 'Uncategorized',
        count: g._count._all,
      })),
    };
  }

  /* ------------------------------------------------------------------ */
  /*  Seller metrics — always scoped to the authenticated seller        */
  /* ------------------------------------------------------------------ */

  async getSellerOverview(sellerId: number, query: AnalyticsQueryDto) {
    const seller = await this.prisma.seller.findUnique({ where: { id: sellerId } });
    if (!seller) throw new NotFoundException('Seller not found');

    const filter = await this.buildDateFilter(query);
    const where = this.orderWhere(filter, { sellerId });
    const threshold = await this.getLowStockThreshold();
    const inv = await this.inventorySummary({ sellerId, deletedAt: null }, threshold);

    const [orderCount, statusGroups, revenueAgg, productsSoldAgg] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.groupBy({ by: ['status'], _count: { _all: true }, where }),
      this.prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { ...where, paymentStatus: PaymentStatus.Completed },
      }),
      this.prisma.order.aggregate({
        _sum: { quantity: true },
        where: { ...where, paymentStatus: PaymentStatus.Completed },
      }),
    ]);

    return {
      range: query.range || '30d',
      revenue: revenueAgg._sum.totalAmount || 0,
      orders: {
        total: orderCount,
        byStatus: this.countBy(statusGroups, 'status', Object.values(OrderStatus)),
      },
      unitsSold: productsSoldAgg._sum.quantity || 0,
      products: {
        total: inv.total,
        lowStock: inv.lowStock,
        outOfStock: inv.outOfStock,
        lowStockThreshold: threshold,
      },
    };
  }

  /** Get the current low-stock threshold (used by configuration UI). */
  async getLowStockThresholdForConfig(): Promise<number> {
    return this.getLowStockThreshold();
  }

  /** Set the low-stock threshold in SiteConfig. Returns the persisted value. */
  async setLowStockThreshold(threshold: number): Promise<number> {
    const t = Number(threshold);
    if (!Number.isInteger(t) || t < 0) {
      throw new BadRequestException('Threshold must be a non-negative integer');
    }
    await this.prisma.siteConfig.upsert({
      where: { key: LOW_STOCK_THRESHOLD_KEY },
      update: { value: { threshold: t } as any },
      create: { key: LOW_STOCK_THRESHOLD_KEY, value: { threshold: t } as any },
    });
    this.logger.log(`Low-stock threshold set to ${t}`);
    return t;
  }
}
