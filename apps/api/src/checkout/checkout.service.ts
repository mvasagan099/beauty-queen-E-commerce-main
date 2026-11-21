import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
  Optional,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';
import { CartService } from '../cart/cart.service';
import { PricingService } from '../pricing/pricing.service';
import { BuyNowDto } from './dto/checkout.dto';
import { CheckoutAddressDto } from './dto/checkout.dto';
import { resolveProductSize } from '../common/product-size.util';
import { WhatsAppService } from '../notifications/whatsapp.service';

@Injectable()
export class CheckoutService {
  private readonly logger = new Logger(CheckoutService.name);

  constructor(
    private prisma: PrismaService,
    private productsService: ProductsService,
    private cartService: CartService,
    private pricingService: PricingService,
    @Optional() private whatsappService?: WhatsAppService,
  ) {}

  async preview(
    userId: number,
    source: 'cart' | 'buynow',
    buyNowItem?: BuyNowDto,
    couponCode?: string,
    pincode?: string,
    district?: string,
  ) {
    let items: { productId: number; size: string; quantity: number }[] = [];

    if (source === 'buynow') {
      if (!buyNowItem) {
        throw new BadRequestException('buyNowItem is required for buynow preview');
      }
      items.push({
        productId: buyNowItem.productId,
        size: buyNowItem.size,
        quantity: buyNowItem.quantity,
      });
    } else {
      const cart = await this.cartService.getCart(userId);
      items = cart.items.map((i) => ({
        productId: i.productId,
        size: i.size,
        quantity: i.quantity,
      }));
      if (items.length === 0) {
        throw new BadRequestException('Your cart is empty');
      }
    }

    const pricing = await this.pricingService.calculatePricing({
      items,
      couponCode,
      userId,
      pincode,
      district,
    });

    return {
      items: pricing.items.map((i) => ({
        productId: i.productId,
        size: i.size,
        quantity: i.quantity,
        name: i.name,
        unitPrice: i.unitPrice,
        mrp: i.mrp,
        lineTotal: i.lineTotal,
        lineDiscount: i.lineDiscount,
      })),
      subtotal: pricing.subtotal,
      productDiscount: pricing.productDiscount,
      couponCode: couponCode || null,
      couponDiscount: pricing.couponDiscount,
      shipping: pricing.shipping,
      tax: pricing.tax,
      total: pricing.total,
    };
  }

  async createOrderFromCart(
    userId: number,
    user: { sub: number; email: string; name?: string },
    address: CheckoutAddressDto,
    paymentMethod: string,
    paymentId?: string,
  ) {
    const cart = await this.cartService.getCart(userId);
    if (cart.items.length === 0) {
      throw new BadRequestException('Your cart is empty');
    }

    const createdOrders = await this.prisma.$transaction(async (tx) => {
      const orders: any[] = [];

      for (const item of cart.items) {
        const product = await tx.product.findFirst({
          where: { id: item.productId, deletedAt: null },
        });
        if (!product) {
          throw new BadRequestException(
            `Product "${item.name}" is no longer available. Please remove it from your cart.`,
          );
        }

        const availableQty = await this.productsService.getAvailableSizeQty(
          product,
          item.size,
        );
        if (item.quantity > availableQty) {
          throw new BadRequestException(
            `Insufficient stock for "${item.name}" (size ${item.size}). Available: ${availableQty}`,
          );
        }

        const price = product.price || 0;
        const { prismaField: sizeField, dbColumn, canonicalSize } = resolveProductSize(item.size);
        const lockedRows = await tx.$queryRawUnsafe(
          `SELECT ${dbColumn} AS qty FROM products WHERE id = ? FOR UPDATE`,
          item.productId,
        );
        const currentQty = (lockedRows as any)[0]?.qty ?? 0;
        if (currentQty < item.quantity) {
          throw new BadRequestException(
            `Insufficient stock for "${item.name}" (size ${canonicalSize}). Available: ${currentQty}`,
          );
        }

        const newOrder = await tx.order.create({
          data: {
            userId,
            productId: item.productId,
            sellerId: product.sellerId,
            name: product.name,
            size: canonicalSize,
            price,
            quantity: item.quantity,
            subtotal: price * item.quantity,
            username: address.name,
            email: address.email,
            address: address.address,
            pincode: address.pincode,
            district: address.district,
            landmark: address.landmark || null,
            paymentMethod: paymentMethod === 'upi' ? 'UPI' : 'COD',
            paymentId: paymentId || null,
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

        await tx.product.update({
          where: { id: item.productId },
          data: {
            [sizeField]: { decrement: item.quantity },
          },
        });

        orders.push(newOrder);
      }

      await tx.cartItem.deleteMany({ where: { userId } });

      return orders;
    });

    this.logger.log(
      `${createdOrders.length} order(s) created from cart for user ${userId}`,
    );
    if (createdOrders.length > 0 && address.phone) {
      const totalAmount = createdOrders.reduce(
        (sum, o) => sum + Number(o.subtotal || 0),
        0,
      );
      this.notifyOrderViaWhatsApp(
        address.phone,
        createdOrders[0].id,
        totalAmount,
        paymentMethod,
      );
    }
    return createdOrders;
  }

  async createOrderFromBuyNow(
    userId: number,
    user: { sub: number; email: string; name?: string },
    dto: BuyNowDto,
    address: CheckoutAddressDto,
    paymentMethod: string,
    paymentId?: string,
  ) {
    const product = await this.prisma.product.findFirst({
      where: { id: dto.productId, deletedAt: null },
    });
    if (!product) {
      throw new NotFoundException('Product is no longer available');
    }

    const { prismaField: sizeField, dbColumn, canonicalSize } = resolveProductSize(dto.size);

    const availableQty = await this.productsService.getAvailableSizeQty(
      product,
      canonicalSize,
    );
    if (availableQty <= 0) {
      throw new BadRequestException(`Size ${canonicalSize} is out of stock`);
    }
    if (dto.quantity > availableQty) {
      throw new BadRequestException(
        `Requested quantity is unavailable. Available: ${availableQty}`,
      );
    }

    const price = product.price || 0;
    const subtotal = price * dto.quantity;

    const order = await this.prisma.$transaction(async (tx) => {
      const locked = await tx.$queryRawUnsafe(
        `SELECT ${dbColumn} AS qty FROM products WHERE id = ? FOR UPDATE`,
        dto.productId,
      );
      const currentQty = (locked as any)[0]?.qty ?? 0;
      if (currentQty < dto.quantity) {
        throw new BadRequestException(
          `Insufficient stock for size ${canonicalSize}. Available: ${currentQty}`,
        );
      }

      const newOrder = await tx.order.create({
        data: {
          userId,
          productId: dto.productId,
          sellerId: product.sellerId,
          name: product.name,
          size: canonicalSize,
          price,
          quantity: dto.quantity,
          subtotal,
          username: address.name,
          email: address.email,
          address: address.address,
          pincode: address.pincode,
          district: address.district,
          landmark: address.landmark || null,
          paymentMethod: paymentMethod === 'upi' ? 'UPI' : 'COD',
          paymentId: paymentId || null,
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

      await tx.product.update({
        where: { id: dto.productId },
        data: {
          [sizeField]: { decrement: dto.quantity },
        },
      });

      return newOrder;
    });

    this.logger.log(`Order ${order.id} created via Buy Now for ${address.email}`);
    if (address.phone) {
      this.notifyOrderViaWhatsApp(address.phone, order.id, subtotal, paymentMethod);
    }
    return order;
  }

  private notifyOrderViaWhatsApp(
    phone: string,
    orderId: number,
    totalAmount: number,
    paymentMethod: string,
  ): void {
    if (!this.whatsappService) return;
    const normalizedMethod = (paymentMethod || '').toLowerCase();
    const task =
      normalizedMethod === 'cod'
        ? this.whatsappService.sendCodVerificationPrompt(phone, orderId, totalAmount)
        : this.whatsappService.sendOrderConfirmation(phone, orderId, totalAmount);

    void task.catch((err: any) => {
      this.logger.warn(`WhatsApp dispatch failed for order ${orderId}: ${err?.message}`);
    });
  }
}
