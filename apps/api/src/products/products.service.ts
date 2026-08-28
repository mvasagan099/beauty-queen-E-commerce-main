import { Injectable, NotFoundException, BadRequestException, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { ImageService } from '../common/image.service';
import { SearchService } from '../search/search.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/types/audit.types';

@Injectable()
export class ProductsService {
  private readonly logger = new Logger(ProductsService.name);

  constructor(
    private prisma: PrismaService,
    private imageService: ImageService,
    private searchService: SearchService,
    private auditService: AuditService,
  ) {}

  private inStockWhere() {
    return {
      deletedAt: null as any,
      OR: [
        { sizeS: { gt: 0 } },
        { sizeM: { gt: 0 } },
        { sizeL: { gt: 0 } },
        { sizeXl: { gt: 0 } },
        { sizeXxl: { gt: 0 } },
        { quantity: { gt: 0 } },
      ],
    };
  }

  async findAll(params?: {
    category?: string;
    sort?: string;
    search?: string;
    page?: number;
    limit?: number;
    offset?: number;
    minPrice?: number;
    maxPrice?: number;
    inStock?: boolean;
  }) {
    const where: any = this.inStockWhere();

    if (params?.category) {
      where.ptype = params.category;
    }

    if (params?.search && params.search.trim().length > 0) {
      const searchTerm = params.search.trim();
      where.AND = where.AND || [];
      where.AND.push({
        OR: [
          { name: { contains: searchTerm } },
          { description: { contains: searchTerm } },
          { ptype: { contains: searchTerm } },
        ],
      });
    }

    if (params?.minPrice != null || params?.maxPrice != null) {
      const priceFilter: any = {};
      if (params.minPrice != null) priceFilter.gte = params.minPrice;
      if (params.maxPrice != null) priceFilter.lte = params.maxPrice;
      where.AND = where.AND || [];
      where.AND.push({ price: priceFilter });
    }

    let orderBy: any = { id: 'desc' };
    const sortMap: Record<string, any> = {
      price_asc: { price: 'asc' },
      price_desc: { price: 'desc' },
      newest: { id: 'desc' },
      name_asc: { name: 'asc' },
      name_desc: { name: 'desc' },
    };
    if (params?.sort && sortMap[params.sort]) {
      orderBy = sortMap[params.sort];
    }

    const limit = Math.min(100, Math.max(1, params?.limit || 20));
    const page = Math.max(1, params?.page || 1);
    const offset = params?.offset ?? (page - 1) * limit;

    const [products, total] = await Promise.all([
      this.prisma.product.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
      }),
      this.prisma.product.count({ where }),
    ]);

    const totalPages = Math.ceil(total / limit);

    return {
      products,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    };
  }

  async findById(id: number) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const sizes: string[] = [];
    if (product.sizeS && product.sizeS > 0) sizes.push('Small');
    if (product.sizeM && product.sizeM > 0) sizes.push('Medium');
    if (product.sizeL && product.sizeL > 0) sizes.push('Large');
    if (product.sizeXl && product.sizeXl > 0) sizes.push('XL');
    if (product.sizeXxl && product.sizeXxl > 0) sizes.push('XXL');

    const relatedProducts = await this.getRelatedProducts(id);

    return { product, sizes, relatedProducts };
  }

  async getRelatedProducts(id: number, take = 4) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Order candidates by relevance: same category/product type first, then
    // newest. Only in-stock, non-deleted products are recommended.
    const sameType = await this.prisma.product.findMany({
      where: {
        ...this.inStockWhere(),
        id: { not: id },
        ...(product.ptype ? { ptype: product.ptype } : {}),
      },
      orderBy: { id: 'desc' },
      take,
    });

    if (sameType.length >= take) {
      return sameType;
    }

    const existingIds = sameType.map((p) => p.id);
    const fillers = await this.prisma.product.findMany({
      where: {
        ...this.inStockWhere(),
        id: { not: id, notIn: existingIds },
      },
      orderBy: { id: 'desc' },
      take: take - sameType.length,
    });

    return [...sameType, ...fillers];
  }

  /**
   * Frequently bought together: products co-ordered by the same shoppers.
   *
   * Order rows are single-line (one product per row), so pairings are derived
   * from orders of OTHER products made by buyers of this product. Only enough
   * co-purchases (minOccurrences) count, and recommendations are always
   * in-stock + non-deleted. Falls back to related products when there is not
   * enough real co-purchase data.
   */
  async getFrequentlyBoughtTogether(id: number, take = 4, minOccurrences = 2) {
    const product = await this.prisma.product.findFirst({
      where: { id, deletedAt: null },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    const eligibleStatuses = ['Delivered', 'Confirmed', 'Processing', 'Shipped', 'Pending'];

    const buyers = await this.prisma.order.findMany({
      where: { productId: id, userId: { not: null }, status: { in: eligibleStatuses as any } },
      select: { userId: true },
      distinct: ['userId'],
    });

    if (buyers.length === 0) {
      return this.getRelatedProducts(id, take);
    }

    const userIds = buyers.map((b) => b.userId as number);

    const coOrders = await this.prisma.order.findMany({
      where: {
        userId: { in: userIds },
        productId: { not: id },
        status: { in: eligibleStatuses as any },
      },
      select: { productId: true },
    });

    const counts = new Map<number, number>();
    for (const order of coOrders) {
      counts.set(order.productId, (counts.get(order.productId) || 0) + 1);
    }

    const candidates = [...counts.entries()]
      .filter(([, count]) => count >= minOccurrences)
      .sort((a, b) => b[1] - a[1])
      .map(([productId]) => productId)
      .slice(0, take * 2);

    if (candidates.length === 0) {
      return this.getRelatedProducts(id, take);
    }

    // Recommendation safety: only in-stock, non-deleted products are returned.
    const stocked = await this.prisma.product.findMany({
      where: { id: { in: candidates }, ...this.inStockWhere() },
    });

    const byId = new Map(stocked.map((p) => [p.id, p]));
    const result: Awaited<ReturnType<ProductsService['getRelatedProducts']>> = [];
    for (const candidateId of candidates) {
      const candidate = byId.get(candidateId);
      if (candidate) {
        result.push(candidate);
      }
      if (result.length >= take) {
        break;
      }
    }

    if (result.length >= take) {
      return result;
    }

    // Fill remaining slots with related products, never duplicating.
    const fillers = await this.getRelatedProducts(id, take - result.length);
    const seen = new Set(result.map((p) => p.id));
    return [...result, ...fillers.filter((p) => !seen.has(p.id))];
  }

  async getHomepageData() {
    const inStock = this.inStockWhere();

    const [newArrival, saree, kurthi, top, leggin, cosmetics, randomProducts, highPrice, lowPrice] =
      await Promise.all([
        this.prisma.product.findMany({ where: inStock, orderBy: { id: 'desc' }, take: 4 }),
        this.prisma.product.findMany({ where: { ...inStock, ptype: 'saree' }, take: 6 }),
        this.prisma.product.findMany({ where: { ...inStock, ptype: 'kurthi' }, take: 6 }),
        this.prisma.product.findMany({ where: { ...inStock, ptype: 'top' }, take: 6 }),
        this.prisma.product.findMany({ where: { ...inStock, ptype: 'leggin' }, take: 6 }),
        this.prisma.product.findMany({ where: { ...inStock, ptype: 'cosmetics' }, take: 6 }),
        this.prisma.product.findMany({ where: inStock, take: 4 }),
        this.prisma.product.findMany({ where: inStock, orderBy: { price: 'desc' }, take: 4 }),
        this.prisma.product.findMany({ where: inStock, orderBy: { price: 'asc' }, take: 4 }),
      ]);

    return { newArrival, saree, kurthi, top, leggin, cosmetics, randomProducts, highPrice, lowPrice };
  }

  async search(
    query: string,
    page?: number,
    limit?: number,
    sort?: 'price_asc' | 'price_desc' | 'newest' | string,
  ) {
    const result = await this.searchService.search({
      query,
      page,
      limit,
      sort: sort as 'price_asc' | 'price_desc' | 'newest',
      baseWhere: this.inStockWhere() as Record<string, unknown>,
    });

    // Zero-result recovery: suggest real categories (with in-stock products)
    // that match the search term so shoppers can keep browsing.
    if (result.pagination.total === 0) {
      const suggestedCategories = await this.searchService.matchingCategories(query, 4);
      return { ...result, suggestedCategories };
    }

    return result;
  }

  async findAllForAdmin() {
    return this.prisma.product.findMany({
      orderBy: { id: 'desc' },
    });
  }

  async create(dto: CreateProductDto, imagePaths: string[] = [], sellerId?: number) {
    const data: any = {
      name: dto.name,
      price: dto.price,
      description: dto.description || null,
      mrp: dto.mrp || null,
      ptype: dto.ptype || null,
      quantity: dto.quantity || null,
      sizeS: dto.sizeS || 0,
      sizeM: dto.sizeM || 0,
      sizeL: dto.sizeL || 0,
      sizeXl: dto.sizeXl || 0,
      sizeXxl: dto.sizeXxl || 0,
    };

    if (sellerId) {
      data.sellerId = sellerId;
    }

    if (imagePaths.length > 0) {
      data.image = imagePaths[0] || null;
      data.image1 = imagePaths[1] || null;
      data.image2 = imagePaths[2] || null;
      data.image3 = imagePaths[3] || null;
      data.image4 = imagePaths[4] || null;
    }

    return this.prisma.product.create({ data }).then(async (product) => {
      await this.auditService.log({
        action: AuditAction.PRODUCT_CREATED,
        entityType: 'Product',
        entityId: product.id,
        details: { name: product.name, price: product.price },
      });
      return product;
    });
  }

  async update(id: number, dto: UpdateProductDto, imagePaths?: string[], userId?: number, userRole?: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (userRole === 'SELLER' && product.sellerId !== userId) {
      throw new ForbiddenException('You do not own this product');
    }

    if (userRole === 'SELLER' && product.deletedAt) {
      throw new ForbiddenException('Cannot modify deleted product');
    }

    const data: any = {};
    if (dto.name !== undefined) data.name = dto.name;
    if (dto.price !== undefined) data.price = dto.price;
    if (dto.description !== undefined) data.description = dto.description;
    if (dto.mrp !== undefined) data.mrp = dto.mrp;
    if (dto.ptype !== undefined) data.ptype = dto.ptype;
    if (dto.quantity !== undefined) data.quantity = dto.quantity;
    if (dto.sizeS !== undefined) data.sizeS = dto.sizeS;
    if (dto.sizeM !== undefined) data.sizeM = dto.sizeM;
    if (dto.sizeL !== undefined) data.sizeL = dto.sizeL;
    if (dto.sizeXl !== undefined) data.sizeXl = dto.sizeXl;
    if (dto.sizeXxl !== undefined) data.sizeXxl = dto.sizeXxl;

    if (imagePaths && imagePaths.length > 0) {
      this.imageService.deleteImages([
        product.image, product.image1, product.image2, product.image3, product.image4,
      ]);
      data.image = imagePaths[0] || null;
      data.image1 = imagePaths[1] || null;
      data.image2 = imagePaths[2] || null;
      data.image3 = imagePaths[3] || null;
      data.image4 = imagePaths[4] || null;
    }

    return this.prisma.product.update({ where: { id }, data }).then(async (updated) => {
      await this.auditService.log({
        action: AuditAction.PRODUCT_UPDATED,
        entityType: 'Product',
        entityId: id,
        actorId: userId,
        actorRole: userRole,
        details: { updatedFields: Object.keys(data) },
      });
      return updated;
    });
  }

  async softDelete(id: number, userId?: number, userRole?: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (userRole === 'SELLER' && product.sellerId !== userId) {
      throw new ForbiddenException('You do not own this product');
    }

    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: new Date() },
    }).then(async (deleted) => {
      await this.auditService.log({
        action: AuditAction.PRODUCT_DELETED,
        entityType: 'Product',
        entityId: id,
        actorId: userId,
        actorRole: userRole,
        details: { name: product.name },
      });
      return deleted;
    });
  }

  private async assertProductAccess(id: number, userId?: number, userRole?: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (userRole === 'SELLER' && product.sellerId !== userId) {
      throw new ForbiddenException('You do not own this product');
    }

    if (product.deletedAt) {
      throw new BadRequestException('Cannot modify a deleted product');
    }

    return product;
  }

  async addImage(id: number, imagePath: string, userId?: number, userRole?: string) {
    const product = await this.assertProductAccess(id, userId, userRole);

    const slots = ['image', 'image1', 'image2', 'image3', 'image4'] as const;
    const emptySlot = slots.find((slot) => !product[slot]);

    if (!emptySlot) {
      throw new BadRequestException('Maximum 5 images allowed. Remove an image before adding another.');
    }

    const updated = await this.prisma.product.update({
      where: { id },
      data: { [emptySlot]: imagePath },
    });

    await this.auditService.log({
      action: AuditAction.PRODUCT_UPDATED,
      entityType: 'Product',
      entityId: id,
      actorId: userId,
      actorRole: userRole,
      details: { addedImageToSlot: emptySlot },
    });

    return updated;
  }

  async removeImage(id: number, imageId: number, userId?: number, userRole?: string) {
    const product = await this.assertProductAccess(id, userId, userRole);

    const slots = ['image', 'image1', 'image2', 'image3', 'image4'] as const;
    if (imageId < 1 || imageId > slots.length) {
      throw new BadRequestException(`imageId must be between 1 and ${slots.length}`);
    }

    const slot = slots[imageId - 1];
    const imagePath = product[slot];
    if (!imagePath) {
      throw new NotFoundException(`Image ${imageId} not found on this product`);
    }

    this.imageService.deleteImage(imagePath);

    const updated = await this.prisma.product.update({
      where: { id },
      data: { [slot]: null },
    });

    await this.auditService.log({
      action: AuditAction.PRODUCT_UPDATED,
      entityType: 'Product',
      entityId: id,
      actorId: userId,
      actorRole: userRole,
      details: { removedImageFromSlot: slot },
    });

    return updated;
  }

  async restore(id: number, userId?: number, userRole?: string) {
    const product = await this.prisma.product.findUnique({ where: { id } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (userRole === 'SELLER' && product.sellerId !== userId) {
      throw new ForbiddenException('You do not own this product');
    }

    return this.prisma.product.update({
      where: { id },
      data: { deletedAt: null },
    }).then(async (restored) => {
      await this.auditService.log({
        action: AuditAction.PRODUCT_RESTORED,
        entityType: 'Product',
        entityId: id,
        actorId: userId,
        actorRole: userRole,
        details: { name: product.name },
      });
      return restored;
    });
  }

  async getAvailableSizeQty(product: any, size: string): Promise<number> {
    const normalized = size.toLowerCase();
    const sizeMap: Record<string, number> = {
      s: product.sizeS || 0,
      small: product.sizeS || 0,
      m: product.sizeM || 0,
      medium: product.sizeM || 0,
      l: product.sizeL || 0,
      large: product.sizeL || 0,
      xl: product.sizeXl || 0,
      xxl: product.sizeXxl || 0,
    };
    return sizeMap[normalized] || 0;
  }

  async validateSize(product: any, size: string): Promise<void> {
    const validSizes = ['S', 'M', 'L', 'XL', 'XXL', 'Small', 'Medium', 'Large'];
    const normalized = size.toUpperCase().replace('SMALL', 'S').replace('MEDIUM', 'M').replace('LARGE', 'L');
    if (!validSizes.includes(size) && !['S', 'M', 'L', 'XL', 'XXL'].includes(normalized)) {
      throw new BadRequestException(`Invalid size: ${size}. Valid sizes: S, M, L, XL, XXL`);
    }

    const qty = await this.getAvailableSizeQty(product, size);
    if (qty <= 0) {
      throw new BadRequestException(`Size ${size} is not available for this product`);
    }
  }

  async validateStock(productId: number, size: string, requestedQty: number): Promise<void> {
    const product = await this.prisma.product.findUnique({ where: { id: productId } });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    await this.validateSize(product, size);

    const availableQty = await this.getAvailableSizeQty(product, size);
    if (requestedQty > availableQty) {
      throw new BadRequestException(
        `Insufficient stock. Requested: ${requestedQty}, Available: ${availableQty}`,
      );
    }
  }
}
