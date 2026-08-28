import { Injectable, NotFoundException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CartService } from '../cart/cart.service';

@Injectable()
export class WishlistService {
  private readonly logger = new Logger(WishlistService.name);

  constructor(
    private prisma: PrismaService,
    private cartService: CartService,
  ) {}

  async list(userId: number) {
    const items = await this.prisma.wishlistItem.findMany({
      where: { userId },
      include: { product: true },
      orderBy: { createdAt: 'desc' },
    });
    return { items, count: items.length };
  }

  async toggle(userId: number, productId: number) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const existing = await this.prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
    });

    if (existing) {
      await this.prisma.wishlistItem.delete({ where: { id: existing.id } });
      this.logger.log(`Product ${productId} removed from wishlist for user ${userId}`);
      return { success: true, message: 'Removed from wishlist', wishlisted: false };
    }

    await this.prisma.wishlistItem.create({
      data: { userId, productId },
    });
    this.logger.log(`Product ${productId} added to wishlist for user ${userId}`);
    return { success: true, message: 'Added to wishlist', wishlisted: true };
  }

  async clear(userId: number) {
    await this.prisma.wishlistItem.deleteMany({ where: { userId } });
    return { success: true, message: 'Wishlist cleared' };
  }

  /**
   * Move a wishlist item into the cart. Picks the first available size
   * (S, M, L, XL, XXL) and removes the item from the wishlist afterwards.
   * If the product has no sellable size it is kept in the wishlist and a
   * 400 is returned so the UI can inform the shopper it is out of stock.
   */
  async moveToCart(userId: number, productId: number) {
    const wishlistItem = await this.prisma.wishlistItem.findUnique({
      where: { userId_productId: { userId, productId } },
      include: { product: true },
    });

    if (!wishlistItem) {
      throw new NotFoundException('Wishlist item not found');
    }

    const product = wishlistItem.product;
    if (!product || product.deletedAt) {
      throw new NotFoundException('Product not found');
    }

    const sizeFields: Array<[string, keyof typeof product & string, number | null]> = [
      ['S', 'sizeS', product.sizeS],
      ['M', 'sizeM', product.sizeM],
      ['L', 'sizeL', product.sizeL],
      ['XL', 'sizeXl', product.sizeXl],
      ['XXL', 'sizeXxl', product.sizeXxl],
    ];
    const size = sizeFields.find(([, , stock]) => (stock ?? 0) > 0)?.[0];

    if (!size) {
      throw new BadRequestException('This product is currently out of stock');
    }

    const cartItem = await this.cartService.addItem(userId, { productId, size, quantity: 1 });
    await this.prisma.wishlistItem.delete({ where: { id: wishlistItem.id } });

    this.logger.log(`Wishlist item ${productId} (${size}) moved to cart for user ${userId}`);

    return {
      success: true,
      message: 'Moved to cart',
      cartItem: {
        id: cartItem.id,
        productId,
        name: product.name || 'Unknown Product',
        price: product.price || 0,
        mrp: product.mrp,
        image: product.image,
        size,
        quantity: cartItem.quantity,
        subtotal: (product.price || 0) * cartItem.quantity,
      },
    };
  }
}
