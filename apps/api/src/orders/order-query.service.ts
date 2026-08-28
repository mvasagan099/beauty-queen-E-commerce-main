import { Injectable } from '@nestjs/common';
import { Prisma, OrderStatus, PaymentStatus } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export interface OrderQueryFilters {
  status?: string;
  search?: string;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
  sellerId?: number;
  productId?: number;
  page?: number;
  limit?: number;
}

export interface OrderListResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

/**
 * Centralized order query/filter logic shared by customer, admin and seller
 * order listings. Keeps search/filter concerns out of the controllers and the
 * status state machine.
 */
@Injectable()
export class OrderQueryService {
  constructor(private prisma: PrismaService) {}

  /**
   * Build a Prisma `where` clause from the common query filters.
   */
  buildWhere(filters: OrderQueryFilters): Prisma.OrderWhereInput {
    const where: Prisma.OrderWhereInput = {};

    if (filters.status) {
      where.status = filters.status as OrderStatus;
    }

    if (filters.paymentStatus) {
      where.paymentStatus = filters.paymentStatus as PaymentStatus;
    }

    if (filters.sellerId !== undefined && filters.sellerId !== null) {
      where.sellerId = filters.sellerId;
    }

    if (filters.productId) {
      where.productId = filters.productId;
    }

    if (filters.dateFrom || filters.dateTo) {
      where.orderDate = {};
      if (filters.dateFrom) {
        const from = new Date(`${filters.dateFrom}T00:00:00`);
        if (!isNaN(from.getTime())) (where.orderDate as any).gte = from;
      }
      if (filters.dateTo) {
        const to = new Date(`${filters.dateTo}T23:59:59`);
        if (!isNaN(to.getTime())) (where.orderDate as any).lte = to;
      }
      if (Object.keys(where.orderDate as any).length === 0) {
        delete where.orderDate;
      }
    }

    if (filters.search) {
      where.OR = [
        { username: { contains: filters.search } },
        { email: { contains: filters.search } },
        { name: { contains: filters.search } },
        { trackingNumber: { contains: filters.search } },
        { paymentId: { contains: filters.search } },
        { id: this.parseNumericId(filters.search) },
      ].filter(Boolean) as Prisma.OrderWhereInput[];
    }

    return where;
  }

  private parseNumericId(search: string): number | undefined {
    const n = Number(search);
    return Number.isInteger(n) && n > 0 ? n : undefined;
  }

  async paginate<T = any>(
    where: Prisma.OrderWhereInput,
    filters: OrderQueryFilters,
    include?: Prisma.OrderInclude,
  ): Promise<OrderListResult<T>> {
    const page = Math.max(1, Number(filters.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
    const skip = (page - 1) * limit;

    const [total, data] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        include,
        orderBy: { orderDate: 'desc' },
        skip,
        take: limit,
      }),
    ]);

    return {
      data: data as unknown as T[],
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
