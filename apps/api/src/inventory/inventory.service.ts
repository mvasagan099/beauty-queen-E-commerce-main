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

  private getSizeField(size: string): string | null {
    const sizeMap: Record<string, string> = {
      S: 'sizeS',
      M: 'sizeM',
      L: 'sizeL',
      XL: 'sizeXl',
      XXL: 'sizeXxl',
    };
    return sizeMap[size.toUpperCase()] || null;
  }
}
