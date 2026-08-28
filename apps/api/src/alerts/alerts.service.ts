import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StockAlertStatus, PriceAlertStatus, Product } from '@prisma/client';

@Injectable()
export class AlertsService {
  private readonly logger = new Logger(AlertsService.name);

  constructor(private prisma: PrismaService) {}

  /** True when the product has any sellable stock (size columns or quantity). */
  hasStock(product: Product): boolean {
    return (
      (product.quantity ?? 0) > 0 ||
      (product.sizeS ?? 0) > 0 ||
      (product.sizeM ?? 0) > 0 ||
      (product.sizeL ?? 0) > 0 ||
      (product.sizeXl ?? 0) > 0 ||
      (product.sizeXxl ?? 0) > 0
    );
  }

  private productSummary(product: Product) {
    return {
      id: product.id,
      name: product.name,
      price: product.price,
      mrp: product.mrp,
      image: product.image,
    };
  }

  async listMyAlerts(userId: number) {
    const [stockAlerts, priceAlerts] = await Promise.all([
      this.prisma.stockAlert.findMany({
        where: { userId },
        include: { product: true },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.priceAlert.findMany({
        where: { userId },
        include: { product: true },
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      stockAlerts: stockAlerts.map((a) => ({
        id: a.id,
        productId: a.productId,
        product: this.productSummary(a.product),
        size: a.size,
        status: a.status,
        notifiedAt: a.notifiedAt,
        createdAt: a.createdAt,
      })),
      priceAlerts: priceAlerts.map((a) => ({
        id: a.id,
        productId: a.productId,
        product: this.productSummary(a.product),
        watchedPrice: a.watchedPrice,
        status: a.status,
        notifiedAt: a.notifiedAt,
        createdAt: a.createdAt,
      })),
    };
  }

  async getStockAlert(userId: number, productId: number) {
    return this.prisma.stockAlert.findUnique({
      where: { userId_productId: { userId, productId } },
    });
  }

  async getPriceAlert(userId: number, productId: number) {
    return this.prisma.priceAlert.findUnique({
      where: { userId_productId: { userId, productId } },
    });
  }

  async createStockAlert(userId: number, productId: number, email: string, size?: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (this.hasStock(product)) {
      throw new BadRequestException('This product is already in stock, no alert needed');
    }

    // Restore a previously cancelled/triggered alert rather than duplicating.
    const existing = await this.prisma.stockAlert.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existing && existing.status === StockAlertStatus.WAITING) {
      return {
        success: true,
        message: 'You will be notified by email when this product is back in stock',
        alert: existing,
      };
    }

    const alert = existing
      ? await this.prisma.stockAlert.update({
          where: { id: existing.id },
          data: { status: StockAlertStatus.WAITING, size: size ?? null, notifiedAt: null },
        })
      : await this.prisma.stockAlert.create({
          data: { userId, productId, email, size: size ?? null },
        });

    this.logger.log(`Back-in-stock alert created for user ${userId} on product ${productId}`);
    return {
      success: true,
      message: 'You will be notified by email when this product is back in stock',
      alert,
    };
  }

  async cancelStockAlert(userId: number, productId: number) {
    const existing = await this.prisma.stockAlert.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (!existing) {
      throw new NotFoundException('No active back-in-stock alert for this product');
    }

    if (existing.status === StockAlertStatus.TRIGGERED) {
      return { success: true, message: 'This alert has already been fulfilled' };
    }

    await this.prisma.stockAlert.update({
      where: { id: existing.id },
      data: { status: StockAlertStatus.CANCELLED },
    });

    this.logger.log(`Back-in-stock alert cancelled for user ${userId} on product ${productId}`);
    return { success: true, message: 'Back-in-stock alert cancelled' };
  }

  async createPriceAlert(userId: number, productId: number, watchedPrice: number) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const existing = await this.prisma.priceAlert.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existing && existing.status === PriceAlertStatus.WATCHING) {
      return {
        success: true,
        message: `You will be notified if the price drops to ₹${watchedPrice} or below`,
        alert: existing,
      };
    }

    const alert = existing
      ? await this.prisma.priceAlert.update({
          where: { id: existing.id },
          data: { status: PriceAlertStatus.WATCHING, watchedPrice, notifiedAt: null },
        })
      : await this.prisma.priceAlert.create({
          data: { userId, productId, watchedPrice },
        });

    this.logger.log(`Price alert created for user ${userId} on product ${productId} at ₹${watchedPrice}`);
    return {
      success: true,
      message: `You will be notified if the price drops to ₹${watchedPrice} or below`,
      alert,
    };
  }

  async cancelPriceAlert(userId: number, productId: number) {
    const existing = await this.prisma.priceAlert.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (!existing) {
      throw new NotFoundException('No active price alert for this product');
    }

    if (existing.status === PriceAlertStatus.TRIGGERED) {
      return { success: true, message: 'This alert has already been fulfilled' };
    }

    await this.prisma.priceAlert.update({
      where: { id: existing.id },
      data: { status: PriceAlertStatus.CANCELLED },
    });

    this.logger.log(`Price alert cancelled for user ${userId} on product ${productId}`);
    return { success: true, message: 'Price alert cancelled' };
  }
}