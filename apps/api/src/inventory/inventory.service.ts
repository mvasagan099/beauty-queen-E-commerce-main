import { Injectable, NotFoundException, BadRequestException, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class InventoryService {
  private readonly logger = new Logger(InventoryService.name);

  constructor(private prisma: PrismaService) {}

  async getStock(productId: number, userId?: number, userRole?: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (userRole === 'SELLER' && product.sellerId !== userId) {
      throw new ForbiddenException('You do not own this product');
    }

    return {
      productId: product.id,
      name: product.name,
      sizes: {
        S: product.sizeS || 0,
        M: product.sizeM || 0,
        L: product.sizeL || 0,
        XL: product.sizeXl || 0,
        XXL: product.sizeXxl || 0,
      },
      totalStock:
        (product.sizeS || 0) +
        (product.sizeM || 0) +
        (product.sizeL || 0) +
        (product.sizeXl || 0) +
        (product.sizeXxl || 0),
    };
  }

  async updateStock(productId: number, size: string, quantity: number, userId?: number, userRole?: string) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (userRole === 'SELLER' && product.sellerId !== userId) {
      throw new ForbiddenException('You do not own this product');
    }

    const sizeField = this.getSizeField(size);
    if (!sizeField) {
      throw new BadRequestException(`Invalid size: ${size}. Valid sizes: S, M, L, XL, XXL`);
    }

    if (!Number.isInteger(quantity) || quantity < 0) {
      throw new BadRequestException('Quantity must be a non-negative integer');
    }

    const updated = await this.prisma.product.update({
      where: { id: productId },
      data: { [sizeField]: quantity },
    });

    this.logger.log(`Stock updated for product ${productId}, size ${size}: ${quantity}`);
    return { success: true, message: 'Stock updated', product: updated };
  }

  async decrementStock(productId: number, size: string, quantity: number): Promise<boolean> {
    if (!Number.isInteger(quantity) || quantity <= 0) {
      throw new BadRequestException('Quantity must be a positive integer');
    }

    const sizeField = this.getSizeField(size);
    if (!sizeField) {
      throw new BadRequestException(`Invalid size: ${size}`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const product = await tx.product.findUnique({
        where: { id: productId },
        select: { [sizeField]: true },
      });

      if (!product) {
        throw new NotFoundException('Product not found');
      }

      const currentQty = (product as any)[sizeField] || 0;
      if (currentQty < quantity) {
        throw new BadRequestException(
          `Insufficient stock for ${size}. Available: ${currentQty}, Requested: ${quantity}`,
        );
      }

      await tx.product.update({
        where: { id: productId },
        data: { [sizeField]: { decrement: quantity } },
      });

      return true;
    });

    return result;
  }

  async bulkUpdateStock(
    updates: { productId: number; size: string; quantity: number }[],
    userId?: number,
    userRole?: string,
  ) {
    if (!Array.isArray(updates) || updates.length === 0) {
      throw new BadRequestException('At least one stock update row is required');
    }
    if (updates.length > 500) {
      throw new BadRequestException('Maximum 500 rows per bulk update');
    }

    const errors: { index: number; productId: number; size: string; reason: string }[] = [];
    const validOps: { productId: number; sizeField: string; quantity: number }[] = [];

    const uniqueIds = Array.from(
      new Set(updates.map((u) => Number(u.productId)).filter((id) => Number.isInteger(id) && id > 0)),
    );
    const products = await this.prisma.product.findMany({
      where: { id: { in: uniqueIds }, deletedAt: null },
      select: { id: true, sellerId: true },
    });
    const productMap = new Map(products.map((p) => [p.id, p]));

    updates.forEach((row, index) => {
      const productId = Number(row.productId);
      const quantity = Number(row.quantity);
      const size = String(row.size || '').trim();
      const product = productMap.get(productId);

      if (!product) {
        errors.push({ index, productId, size, reason: 'Product not found' });
        return;
      }
      if (userRole === 'SELLER' && product.sellerId !== userId) {
        errors.push({ index, productId, size, reason: 'Not authorized for this product' });
        return;
      }
      const sizeField = this.getSizeField(size);
      if (!sizeField) {
        errors.push({ index, productId, size, reason: `Invalid size: ${size}` });
        return;
      }
      if (!Number.isInteger(quantity) || quantity < 0) {
        errors.push({ index, productId, size, reason: 'Quantity must be a non-negative integer' });
        return;
      }

      validOps.push({ productId, sizeField, quantity });
    });

    if (validOps.length > 0) {
      await this.prisma.$transaction(
        validOps.map((op) =>
          this.prisma.product.update({
            where: { id: op.productId },
            data: { [op.sizeField]: op.quantity },
          }),
        ),
      );
    }

    this.logger.log(
      `Bulk stock update by ${userRole || 'SYSTEM'}#${userId ?? 0}: ${validOps.length} updated, ${errors.length} failed`,
    );

    return {
      success: true,
      updatedCount: validOps.length,
      failedCount: errors.length,
      errors,
    };
  }

  async exportInventoryCsv(userId?: number, userRole?: string): Promise<string> {
    const where: any = { deletedAt: null };
    if (userRole === 'SELLER' && userId) {
      where.sellerId = userId;
    }

    const products = await this.prisma.product.findMany({
      where,
      orderBy: { id: 'asc' },
      select: {
        id: true,
        name: true,
        ptype: true,
        price: true,
        sizeS: true,
        sizeM: true,
        sizeL: true,
        sizeXl: true,
        sizeXxl: true,
        quantity: true,
      },
    });

    const escapeCsv = (val: unknown) => {
      const str = String(val ?? '');
      return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
    };

    const lines = [
      'productId,name,category,price,S,M,L,XL,XXL,FREE_SIZE',
      ...products.map((p) =>
        [
          p.id,
          escapeCsv(p.name),
          escapeCsv(p.ptype),
          p.price ?? 0,
          p.sizeS ?? 0,
          p.sizeM ?? 0,
          p.sizeL ?? 0,
          p.sizeXl ?? 0,
          p.sizeXxl ?? 0,
          p.quantity ?? 0,
        ].join(','),
      ),
    ];

    return lines.join('\n');
  }

  private getSizeField(size: string): string | null {
    const sizeMap: Record<string, string> = {
      S: 'sizeS',
      M: 'sizeM',
      L: 'sizeL',
      XL: 'sizeXl',
      XXL: 'sizeXxl',
      FREE_SIZE: 'quantity',
      ONE_SIZE: 'quantity',
    };
    return sizeMap[size.trim().toUpperCase().replace(/[\s-]+/g, '_')] || null;
  }
}
