import { Injectable, UnauthorizedException, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { AuthService } from '../auth/auth.service';
import { AuditService } from '../audit/audit.service';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditAction } from '../audit/types/audit.types';
import * as bcrypt from 'bcryptjs';
import { SignupSellerDto, LoginSellerDto, UpdateSellerProfileDto } from './dto/seller.dto';

@Injectable()
export class SellersService {
  private readonly logger = new Logger(SellersService.name);

  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private configService: ConfigService,
    private authService: AuthService,
    private auditService: AuditService,
    private notificationsService: NotificationsService,
  ) {}

  async signup(dto: SignupSellerDto) {
    const existing = await this.prisma.seller.findFirst({
      where: { OR: [{ email: dto.email }, { mobile: dto.mobile }] },
    });
    if (existing) {
      throw new ConflictException('Seller with this email or mobile already exists');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);
    const seller = await this.prisma.seller.create({
      data: {
        sellername: dto.sellername,
        mobile: dto.mobile,
        email: dto.email,
        password: hashedPassword,
      },
    });

    this.logger.log(`Seller registered: ${dto.email}`);
    return { success: true, message: 'Seller registered successfully', sellerId: seller.id };
  }

  async login(dto: LoginSellerDto) {
    const seller = await this.prisma.seller.findFirst({
      where: { mobile: dto.mobile },
    });
    if (!seller) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!seller.password) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!seller.isActive) {
      throw new UnauthorizedException('Seller account is deactivated');
    }

    const passwordValid = await bcrypt.compare(dto.password, seller.password);
    if (!passwordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const accessSecret = this.configService.get<string>('JWT_ACCESS_SECRET');
    const refreshSecret = this.configService.get<string>('JWT_REFRESH_SECRET');
    if (!accessSecret || !refreshSecret) {
      throw new UnauthorizedException('JWT secrets not configured');
    }

    const payload = { sub: seller.id, email: seller.email, role: 'SELLER' };
    const accessToken = this.jwtService.sign(payload, {
      secret: accessSecret,
      expiresIn: '15m',
    });
    const refreshToken = this.jwtService.sign(payload, {
      secret: refreshSecret,
      expiresIn: '7d',
    });

    this.logger.log(`Seller logged in: ${dto.mobile}`);
    const { password, ...sellerSafe } = seller;
    return { success: true, accessToken, refreshToken, seller: sellerSafe };
  }

  async logout(sellerId: number) {
    await this.authService.logout(sellerId);
    return { success: true, message: 'Logged out successfully' };
  }

  async getProfile(sellerId: number) {
    const seller = await this.prisma.seller.findUnique({ where: { id: sellerId } });
    if (!seller) {
      throw new NotFoundException('Seller not found');
    }
    const { password, ...result } = seller;
    return result;
  }

  async updateProfile(sellerId: number, dto: UpdateSellerProfileDto) {
    const seller = await this.prisma.seller.findUnique({ where: { id: sellerId } });
    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    const updateData: any = {};
    if (dto.sellername) updateData.sellername = dto.sellername;
    if (dto.mobile) updateData.mobile = dto.mobile;
    if (dto.email) updateData.email = dto.email;
    if (dto.password) updateData.password = await bcrypt.hash(dto.password, 10);

    const updated = await this.prisma.seller.update({
      where: { id: sellerId },
      data: updateData,
    });

    const { password, ...result } = updated;
    return { success: true, message: 'Profile updated', seller: result };
  }

  async getDashboard(sellerId: number) {
    const seller = await this.prisma.seller.findUnique({ where: { id: sellerId } });
    if (!seller) {
      throw new NotFoundException('Seller not found');
    }

    const [
      totalProducts,
      pendingOrders,
      processingOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue,
      productsAgg,
      unitsSoldAgg,
      recentOrders,
    ] = await Promise.all([
      this.prisma.product.count({
        where: { sellerId, deletedAt: null },
      }),
      this.prisma.order.count({
        where: { sellerId, status: 'Pending' },
      }),
      this.prisma.order.count({
        where: { sellerId, status: 'Processing' },
      }),
      this.prisma.order.count({
        where: { sellerId, status: 'Delivered' },
      }),
      this.prisma.order.count({
        where: { sellerId, status: 'Cancelled' },
      }),
      this.prisma.order.aggregate({
        _sum: { subtotal: true },
        where: { sellerId, paymentStatus: 'Completed' },
      }),
      this.prisma.product.aggregate({
        _sum: { quantity: true, sizeS: true, sizeM: true, sizeL: true, sizeXl: true, sizeXxl: true },
        where: { sellerId, deletedAt: null },
      }),
      this.prisma.order.aggregate({
        _sum: { quantity: true },
        where: { sellerId, paymentStatus: 'Completed' },
      }),
      this.prisma.order.findMany({
        where: { sellerId },
        include: { product: true },
        orderBy: { orderDate: 'desc' },
        take: 10,
      }),
    ]);

    const agg = productsAgg._sum;
    const totalStock =
      (agg.quantity || 0) +
      (agg.sizeS || 0) +
      (agg.sizeM || 0) +
      (agg.sizeL || 0) +
      (agg.sizeXl || 0) +
      (agg.sizeXxl || 0);

    const totalOrders = pendingOrders + processingOrders + deliveredOrders + cancelledOrders;

    return {
      totalProducts,
      totalOrders,
      pendingOrders,
      processingOrders,
      deliveredOrders,
      cancelledOrders,
      totalRevenue: totalRevenue._sum.subtotal || 0,
      unitsSold: unitsSoldAgg._sum.quantity || 0,
      totalStock,
      recentOrders,
    };
  }

  async getProducts(sellerId: number, filters?: { page?: number; limit?: number; search?: string }) {
    const page = Math.max(1, Math.floor(Number(filters?.page) || 1));
    const limit = Math.min(100, Math.max(1, Math.floor(Number(filters?.limit) || 20)));

    const where: any = { sellerId };
    if (filters?.search) {
      where.OR = [
        { name: { contains: filters.search } },
        { ptype: { contains: filters.search } },
      ];
    }

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy: { id: 'desc' },
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

  async getProduct(sellerId: number, productId: number) {
    const product = await this.prisma.product.findFirst({
      where: { id: productId, sellerId },
    });
    if (!product) {
      throw new NotFoundException('Product not found or access denied');
    }
    return product;
  }

  private async getLowStockThreshold(): Promise<number> {
    const config = await this.prisma.siteConfig.findUnique({
      where: { key: 'lowStockThreshold' },
    });
    const value = config?.value as any;
    if (value != null) {
      const t = typeof value === 'number' ? value : value?.threshold;
      if (typeof t === 'number' && t >= 0) return t;
    }
    return 5;
  }

  async getInventory(sellerId: number) {
    const [, products] = await Promise.all([
      this.prisma.seller.findUnique({ where: { id: sellerId } }),
      this.prisma.product.findMany({
        where: { sellerId, deletedAt: null },
        orderBy: { id: 'desc' },
      }),
    ]);

    const threshold = await this.getLowStockThreshold();

    const items = products.map((p) => {
      const sizes = [
        { size: 'S', quantity: p.sizeS || 0 },
        { size: 'M', quantity: p.sizeM || 0 },
        { size: 'L', quantity: p.sizeL || 0 },
        { size: 'XL', quantity: p.sizeXl || 0 },
        { size: 'XXL', quantity: p.sizeXxl || 0 },
      ].filter((s) => s.quantity > 0);

      const total = sizes.reduce((sum, s) => sum + s.quantity, 0) + (p.quantity || 0);
      let status: 'in_stock' | 'low_stock' | 'out_of_stock';
      if (total === 0) status = 'out_of_stock';
      else if (total <= threshold) status = 'low_stock';
      else status = 'in_stock';

      return {
        id: p.id,
        name: p.name,
        ptype: p.ptype,
        price: p.price,
        image: p.image || p.image1 || null,
        sizes,
        total,
        status,
      };
    });

    return {
      items,
      threshold,
      summary: {
        total: items.length,
        inStock: items.filter((i) => i.status === 'in_stock').length,
        lowStock: items.filter((i) => i.status === 'low_stock').length,
        outOfStock: items.filter((i) => i.status === 'out_of_stock').length,
      },
    };
  }

  async getOrders(sellerId: number, filters?: { status?: string; search?: string }) {
    const where: any = { sellerId };

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

  async getOrder(sellerId: number, orderId: number) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, sellerId },
      include: { product: true, statusHistory: true },
    });
    if (!order) {
      throw new NotFoundException('Order not found or access denied');
    }
    return order;
  }

  private readonly VALID_STATUS_TRANSITIONS: Record<string, string[]> = {
    Pending: ['Processing', 'Cancelled'],
    Processing: ['Shipped', 'Cancelled'],
    Shipped: ['Delivered'],
  };

  async updateOrderStatus(sellerId: number, orderId: number, newStatus: string) {
    const order = await this.prisma.order.findFirst({
      where: { id: orderId, sellerId },
    });
    if (!order) {
      throw new NotFoundException('Order not found or access denied');
    }

    const allowedTransitions = this.VALID_STATUS_TRANSITIONS[order.status];
    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      throw new ConflictException(
        `Cannot transition from ${order.status} to ${newStatus}. Allowed: ${allowedTransitions?.join(', ') || 'none'}`,
      );
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: orderId },
        data: { status: newStatus as any },
        include: { product: true },
      });

      await tx.orderStatusHistory.create({
        data: {
          orderId,
          oldStatus: order.status,
          newStatus,
          changedBy: sellerId,
        },
      });

      return updatedOrder;
    });

    this.logger.log(`Seller ${sellerId} updated order ${orderId} from ${order.status} to ${newStatus}`);

    await this.notificationsService.notifyOrderStatusChanged({
      id: updated.id,
      email: updated.email || '',
      username: updated.username || 'Customer',
      productName: updated.name || 'Product',
      oldStatus: order.status,
      newStatus,
      carrier: updated.carrier || undefined,
      trackingNumber: updated.trackingNumber || undefined,
      trackingUrl: updated.trackingUrl || undefined,
    });

    await this.auditService.log({
      action: AuditAction.ORDER_STATUS_CHANGED,
      entityType: 'Order',
      entityId: orderId,
      actorId: sellerId,
      actorRole: 'SELLER',
      details: { oldStatus: order.status, newStatus },
    });

    return { success: true, message: 'Order status updated', order: updated };
  }
}
