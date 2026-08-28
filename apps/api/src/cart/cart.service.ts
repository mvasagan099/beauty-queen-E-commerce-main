import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { AddToCartDto } from './dto/cart.dto';

export interface CartItemResponse {
  id: number;
  productId: number;
  name: string;
  price: number;
  mrp: number | null;
  image: string | null;
  size: string;
  quantity: number;
  subtotal: number;
}

export interface CartResponse {
  items: CartItemResponse[];
  itemCount: number;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
}

@Injectable()
export class CartService {
  private readonly logger = new Logger(CartService.name);

  constructor(
    private prisma: PrismaService,
    private productsService: ProductsService,
  ) {}

  async getCart(userId: number): Promise<CartResponse> {
    const items = await this.prisma.cartItem.findMany({
      where: { userId },
      include: { product: true },
    });

    const itemsWithTotals: CartItemResponse[] = items
      .filter((item) => item.product && !item.product.deletedAt)
      .map((item) => {
        const price = item.product.price || 0;
        return {
          id: item.id,
          productId: item.productId,
          name: item.product.name || 'Unknown Product',
          price,
          mrp: item.product.mrp,
          image: item.product.image,
          size: item.size,
          quantity: item.quantity,
          subtotal: price * item.quantity,
        };
      });

    const subtotal = itemsWithTotals.reduce((sum, item) => sum + item.subtotal, 0);
    const mrpTotal = itemsWithTotals.reduce((sum, item) => {
      const mrp = item.mrp || item.price;
      return sum + mrp * item.quantity;
    }, 0);
    const discount = Math.max(0, mrpTotal - subtotal);
    const shipping = 0;
    const tax = 0;
    const total = subtotal - discount + shipping + tax;

    return {
      items: itemsWithTotals,
      itemCount: itemsWithTotals.length,
      subtotal,
      discount,
      shipping,
      tax,
      total,
    };
  }

  async addItem(userId: number, dto: AddToCartDto) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const validSizes = ['S', 'M', 'L', 'XL', 'XXL'];
    if (!validSizes.includes(dto.size)) {
      throw new BadRequestException(`Invalid size: ${dto.size}. Valid sizes: ${validSizes.join(', ')}`);
    }

    const availableQty = await this.productsService.getAvailableSizeQty(product, dto.size);
    if (availableQty <= 0) {
      throw new BadRequestException(`Size ${dto.size} is out of stock`);
    }

    const existingItem = await this.prisma.cartItem.findUnique({
      where: {
        userId_productId_size: {
          userId,
          productId: dto.productId,
          size: dto.size,
        },
      },
    });

    if (existingItem) {
      const newQty = existingItem.quantity + dto.quantity;
      if (newQty > availableQty) {
        throw new BadRequestException(
          `Requested quantity (${newQty}) exceeds available stock (${availableQty})`,
        );
      }
      return this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQty },
        include: { product: true },
      });
    }

    if (dto.quantity > availableQty) {
      throw new BadRequestException(
        `Requested quantity (${dto.quantity}) exceeds available stock (${availableQty})`,
      );
    }

    return this.prisma.cartItem.create({
      data: {
        userId,
        productId: dto.productId,
        size: dto.size,
        quantity: dto.quantity,
      },
      include: { product: true },
    });
  }

  async removeItem(userId: number, itemId: number) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, userId },
    });
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    await this.prisma.cartItem.delete({ where: { id: item.id } });
    return { success: true, message: 'Item removed from cart' };
  }

  async clearCart(userId: number) {
    await this.prisma.cartItem.deleteMany({ where: { userId } });
    return { success: true, message: 'Cart cleared' };
  }

  async updateQuantity(userId: number, itemId: number, quantity: number) {
    const item = await this.prisma.cartItem.findFirst({
      where: { id: itemId, userId },
      include: { product: true },
    });
    if (!item) {
      throw new NotFoundException('Cart item not found');
    }

    if (quantity <= 0) {
      await this.prisma.cartItem.delete({ where: { id: item.id } });
      return { success: true, message: 'Item removed from cart' };
    }

    const availableQty = await this.productsService.getAvailableSizeQty(item.product, item.size);
    if (quantity > availableQty) {
      throw new BadRequestException(
        `Requested quantity (${quantity}) exceeds available stock (${availableQty})`,
      );
    }

    return this.prisma.cartItem.update({
      where: { id: item.id },
      data: { quantity },
      include: { product: true },
    });
  }

  async removeItemsByProductAndSize(userId: number, productId: number, size: string) {
    const items = await this.prisma.cartItem.findMany({
      where: { userId, productId, size },
    });
    if (items.length > 0) {
      const ids = items.map((i) => i.id);
      await this.prisma.cartItem.deleteMany({
        where: { id: { in: ids } },
      });
    }
    return { success: true };
  }
}
