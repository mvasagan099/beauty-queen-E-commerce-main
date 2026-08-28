import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/types/audit.types';

export type ExportResource = 'orders' | 'products' | 'customers' | 'refunds' | 'sales';

const EXPORT_RESOURCES: ExportResource[] = ['orders', 'products', 'customers', 'refunds', 'sales'];

const SELLABLE_ORDER_STATUSES = ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Delivered'];

/**
 * Admin CSV exports. Each resource generator emits a header row followed by
 * data rows, fetched in batches so large tables never load in one pass. Rows
 * are streamed to the HTTP response by the controller.
 */
@Injectable()
export class AdminExportsService {
  private readonly logger = new Logger(AdminExportsService.name);

  constructor(
    private prisma: PrismaService,
    private auditService: AuditService,
  ) {}

  static resources(): ExportResource[] {
    return EXPORT_RESOURCES;
  }

  isSupported(resource: string): resource is ExportResource {
    return (EXPORT_RESOURCES as string[]).includes(resource);
  }

  async logExport(actorId: number, resource: string) {
    await this.auditService.log({
      action: AuditAction.ADMIN_EXPORT,
      entityType: 'Export',
      details: { resource },
      actorId,
      actorRole: 'ADMIN',
    });
  }

  /** Async generator of CSV rows (header first) for the resource. */
  async *stream(resource: ExportResource): AsyncGenerator<string> {
    switch (resource) {
      case 'orders':
        yield* this.streamOrders();
        break;
      case 'products':
        yield* this.streamProducts();
        break;
      case 'customers':
        yield* this.streamCustomers();
        break;
      case 'refunds':
        yield* this.streamRefunds();
        break;
      case 'sales':
        yield* this.streamSales();
        break;
      default:
        throw new BadRequestException(`Unsupported export resource: ${resource}`);
    }
  }

  private async *streamOrders() {
    const header = 'id,orderDate,checkoutId,userId,productId,productName,size,price,quantity,subtotal,discountAmount,couponCode,totalAmount,paymentMethod,paymentStatus,status,carrier,trackingNumber,customerEmail,customerName,district';
    yield header;
    for await (const rows of this.paginate((skip, take) =>
      this.prisma.order.findMany({ orderBy: { id: 'asc' }, skip, take }),
    )) {
      for (const o of rows) {
        yield this.row([
          o.id,
          o.orderDate?.toISOString() ?? '',
          o.checkoutId ?? '',
          o.userId ?? '',
          o.productId,
          o.name ?? '',
          o.size ?? '',
          o.price?.toString() ?? '',
          o.quantity ?? '',
          o.subtotal ?? '',
          o.discountAmount ?? '',
          o.couponCode ?? '',
          o.totalAmount ?? '',
          o.paymentMethod ?? '',
          o.paymentStatus,
          o.status,
          o.carrier ?? '',
          o.trackingNumber ?? '',
          o.email ?? '',
          o.username ?? '',
          o.district ?? '',
        ]);
      }
    }
  }

  private async *streamProducts() {
    const header = 'id,name,price,mrp,quantity,ptype,sizeS,sizeM,sizeL,sizeXl,sizeXxl,sellerId,deletedAt,createdAt';
    yield header;
    for await (const rows of this.paginate((skip, take) =>
      this.prisma.product.findMany({ orderBy: { id: 'asc' }, skip, take }),
    )) {
      for (const p of rows) {
        yield this.row([
          p.id,
          p.name ?? '',
          p.price ?? '',
          p.mrp ?? '',
          p.quantity ?? '',
          p.ptype ?? '',
          p.sizeS ?? 0,
          p.sizeM ?? 0,
          p.sizeL ?? 0,
          p.sizeXl ?? 0,
          p.sizeXxl ?? 0,
          p.sellerId ?? '',
          p.deletedAt?.toISOString() ?? '',
          p.createdAt?.toISOString() ?? '',
        ]);
      }
    }
  }

  private async *streamCustomers() {
    const header = 'id,email,name,phone,createdAt';
    yield header;
    for await (const rows of this.paginate((skip, take) =>
      this.prisma.user.findMany({
        where: { role: 'CUSTOMER' },
        orderBy: { id: 'asc' },
        skip,
        take,
      }),
    )) {
      for (const u of rows) {
        yield this.row([u.id, u.email, u.name ?? '', u.phone ?? '', u.createdAt.toISOString()]);
      }
    }
  }

  private async *streamRefunds() {
    const header = 'id,returnRequestId,checkoutId,userId,amount,status,providerRefundId,failureReason,createdAt';
    yield header;
    for await (const rows of this.paginate((skip, take) =>
      this.prisma.refund.findMany({ orderBy: { id: 'asc' }, skip, take }),
    )) {
      for (const r of rows) {
        yield this.row([
          r.id,
          r.returnRequestId ?? '',
          r.checkoutId,
          r.userId,
          r.amount.toString(),
          r.status,
          r.providerRefundId ?? '',
          r.failureReason ?? '',
          r.createdAt.toISOString(),
        ]);
      }
    }
  }

  /** Per-product sales: units + revenue from non-cancelled, non-refunded orders. */
  private async *streamSales() {
    const header = 'productId,productName,unitsSold,grossRevenue,orderCount';
    yield header;

    const agg = await this.prisma.order.groupBy({
      by: ['productId'],
      where: { status: { in: SELLABLE_ORDER_STATUSES as any } },
      _sum: { quantity: true, totalAmount: true },
      _count: true,
      orderBy: { _count: { productId: 'desc' } },
    });

    if (agg.length === 0) return;

    const productIds = agg.map((a) => a.productId);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      select: { id: true, name: true },
    });
    const nameById = new Map(products.map((p) => [p.id, p.name]));

    for (const a of agg) {
      yield this.row([
        a.productId,
        nameById.get(a.productId) ?? '',
        a._sum.quantity ?? 0,
        a._sum.totalAmount?.toString() ?? '0',
        a._count,
      ]);
    }
  }

  private async *paginate<T>(fetchPage: (skip: number, take: number) => Promise<T[]>, take = 500): AsyncGenerator<T[]> {
    let skip = 0;
    for (;;) {
      const rows = await fetchPage(skip, take);
      if (rows.length === 0) break;
      yield rows;
      if (rows.length < take) break;
      skip += take;
    }
  }

  private row(values: unknown[]): string {
    return values
      .map((v) => {
        if (v === null || v === undefined) return '';
        const s = String(v);
        return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
      })
      .join(',');
  }
}