import {
  Controller, Get, Post, Patch, Delete, Param, Query, Body,
  UseGuards, ParseIntPipe, UseInterceptors, UploadedFiles,
  BadRequestException, Req,
} from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiQuery, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { ProductsService } from './products.service';
import { CreateProductDto, UpdateProductDto } from './dto/product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';
import { ImageService } from '../common/image.service';
import { SearchRateLimitInterceptor } from '../common/interceptors/rate-limit.interceptor';

const ALLOWED_SORT_FIELDS = ['price_asc', 'price_desc', 'newest', 'name_asc', 'name_desc'] as const;
const MAX_LIMIT = 100;
const MAX_SEARCH_LENGTH = 200;

@ApiTags('Products')
@Controller('products')
export class ProductsController {
  constructor(
    private productsService: ProductsService,
    private imageService: ImageService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get all products with filtering and pagination' })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'sort', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'offset', required: false })
  @ApiQuery({ name: 'minPrice', required: false })
  @ApiQuery({ name: 'maxPrice', required: false })
  @ApiQuery({ name: 'inStock', required: false })
  async findAll(@Query() query: ProductQueryDto) {
    const safePage = Math.max(1, Math.floor(Number(query.page) || 1));
    const safeLimit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(Number(query.limit) || 20)));

    let safeSort: string | undefined;
    if (query.sort && ALLOWED_SORT_FIELDS.includes(query.sort as any)) {
      safeSort = query.sort;
    }

    let safeSearch: string | undefined;
    if (query.search && typeof query.search === 'string') {
      safeSearch = query.search.trim().substring(0, MAX_SEARCH_LENGTH);
    }
    if (safeSearch === '') safeSearch = undefined;

    let safeCategory: string | undefined;
    if (query.category && typeof query.category === 'string') {
      safeCategory = query.category.trim().substring(0, 50);
    }
    if (safeCategory === '') safeCategory = undefined;

    const safeMinPrice = query.minPrice != null ? Math.max(0, Number(query.minPrice) || 0) : undefined;
    const safeMaxPrice = query.maxPrice != null ? Math.max(0, Number(query.maxPrice) || 0) : undefined;
    const safeInStock = query.inStock === 'true' ? true : undefined;

    const result = await this.productsService.findAll({
      category: safeCategory,
      sort: safeSort,
      search: safeSearch,
      page: safePage,
      limit: safeLimit,
      offset: query.offset != null ? Math.max(0, Math.floor(Number(query.offset) || 0)) : undefined,
      minPrice: safeMinPrice,
      maxPrice: safeMaxPrice,
      inStock: safeInStock,
    });
    return { success: true, ...result };
  }

  @Get('homepage')
  @ApiOperation({ summary: 'Get homepage data' })
  async getHomepage() {
    const data = await this.productsService.getHomepageData();
    return { success: true, ...data };
  }

  @Get('search')
  @UseInterceptors(SearchRateLimitInterceptor)
  @ApiOperation({ summary: 'Search products' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'sort', required: false, enum: ['price_asc', 'price_desc', 'newest'], description: 'Optional sort for results' })
  async search(
    @Query('q') q: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sort') sort?: string,
  ) {
    const safeQ = q ? q.trim().substring(0, MAX_SEARCH_LENGTH) : '';
    const safePage = Math.max(1, Math.floor(Number(page) || 1));
    const safeLimit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(Number(limit) || 20)));
    const safeSort = ['price_asc', 'price_desc', 'newest'].includes(sort || '') ? sort : undefined;

    if (!safeQ) {
      return { success: true, products: [], pagination: { page: safePage, limit: safeLimit, total: 0, totalPages: 0 } };
    }

    const result = await this.productsService.search(safeQ, safePage, safeLimit, safeSort);
    return { success: true, ...result };
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiOperation({ summary: 'Get all products (admin/seller)' })
  async getAllForAdmin() {
    const products = await this.productsService.findAllForAdmin();
    return { success: true, products };
  }

  @Get(':id/related')
  @ApiOperation({ summary: 'Get related products for a product' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of related products (max 12)' })
  async related(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit?: string,
  ) {
    const safeLimit = Math.min(12, Math.max(1, Math.floor(Number(limit) || 4)));
    const relatedProducts = await this.productsService.getRelatedProducts(id, safeLimit);
    return { success: true, relatedProducts };
  }

  @Get(':id/frequently-bought-together')
  @ApiOperation({ summary: 'Get products frequently bought together with a product' })
  @ApiQuery({ name: 'limit', required: false, description: 'Number of recommendations (max 12)' })
  async frequentlyBoughtTogether(
    @Param('id', ParseIntPipe) id: number,
    @Query('limit') limit?: string,
  ) {
    const safeLimit = Math.min(12, Math.max(1, Math.floor(Number(limit) || 4)));
    const recommendations = await this.productsService.getFrequentlyBoughtTogether(id, safeLimit);
    return { success: true, recommendations };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get product by ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const result = await this.productsService.findById(id);
    return { success: true, ...result };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @UseInterceptors(FilesInterceptor('images', 5))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Create a product with images' })
  @ApiBody({ schema: { type: 'object', properties: {
    name: { type: 'string' }, price: { type: 'number' }, mrp: { type: 'number' },
    description: { type: 'string' }, ptype: { type: 'string' }, quantity: { type: 'number' },
    sizeS: { type: 'number' }, sizeM: { type: 'number' }, sizeL: { type: 'number' },
    sizeXl: { type: 'number' }, sizeXxl: { type: 'number' },
    images: { type: 'array', items: { type: 'string', format: 'binary' } },
  }}})
  async create(
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: Record<string, string>,
    @Req() req: any,
  ) {
    const dto: CreateProductDto = {
      name: body.name,
      price: body.price ? parseInt(body.price, 10) : 0,
      mrp: body.mrp ? parseInt(body.mrp, 10) : 0,
      description: body.description,
      ptype: body.ptype,
      quantity: body.quantity ? parseInt(body.quantity, 10) : undefined,
      sizeS: this.toNonNegativeInt(body.sizeS, 0),
      sizeM: this.toNonNegativeInt(body.sizeM, 0),
      sizeL: this.toNonNegativeInt(body.sizeL, 0),
      sizeXl: this.toNonNegativeInt(body.sizeXl, 0),
      sizeXxl: this.toNonNegativeInt(body.sizeXxl, 0),
    };

    if (!dto.name || !dto.price || !dto.ptype) {
      throw new BadRequestException('name, price, and ptype are required');
    }

    if (dto.price < 0) throw new BadRequestException('Price must be non-negative');
    if (dto.mrp !== undefined && dto.mrp !== null && dto.mrp < 0) {
      throw new BadRequestException('MRP must be non-negative');
    }

    if (!this.areSizesValid(dto)) {
      throw new BadRequestException('Size quantities must be non-negative numbers');
    }

    const imagePaths = await this.imageService.processImages(files);
    const sellerId = req.user?.role === 'SELLER' ? req.user?.sub : undefined;
    const product = await this.productsService.create(dto, imagePaths, sellerId);
    return { success: true, message: 'Product created', product };
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @UseInterceptors(FilesInterceptor('images', 5))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Update a product' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Body() body: Record<string, string>,
    @Req() req: any,
  ) {
    const dto: UpdateProductDto = {};
    if (body.name) dto.name = body.name;
    if (body.price !== undefined) dto.price = parseInt(body.price, 10);
    if (body.mrp !== undefined) dto.mrp = body.mrp ? parseInt(body.mrp, 10) : undefined;
    if (body.description !== undefined) dto.description = body.description;
    if (body.ptype) dto.ptype = body.ptype;
    if (body.quantity !== undefined) dto.quantity = body.quantity ? parseInt(body.quantity, 10) : undefined;
    if (body.sizeS !== undefined) dto.sizeS = this.parseSize(body.sizeS);
    if (body.sizeM !== undefined) dto.sizeM = this.parseSize(body.sizeM);
    if (body.sizeL !== undefined) dto.sizeL = this.parseSize(body.sizeL);
    if (body.sizeXl !== undefined) dto.sizeXl = this.parseSize(body.sizeXl);
    if (body.sizeXxl !== undefined) dto.sizeXxl = this.parseSize(body.sizeXxl);

    if (dto.price !== undefined && dto.price < 0) {
      throw new BadRequestException('Price must be non-negative');
    }
    if (dto.mrp !== undefined && dto.mrp !== null && dto.mrp < 0) {
      throw new BadRequestException('MRP must be non-negative');
    }
    if (!this.areSizesValid(dto)) {
      throw new BadRequestException('Size quantities must be non-negative numbers');
    }

    const imagePaths = files?.length ? await this.imageService.processImages(files) : undefined;
    const product = await this.productsService.update(
      id, dto, imagePaths, req.user?.sub, req.user?.role,
    );
    return { success: true, message: 'Product updated', product };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiOperation({ summary: 'Delete a product (soft)' })
  async delete(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    await this.productsService.softDelete(id, req.user?.sub, req.user?.role);
    return { success: true, message: 'Product deleted' };
  }

  @Post(':id/images')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @UseInterceptors(FilesInterceptor('images', 5))
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Add an image to a product' })
  @ApiBody({ schema: { type: 'object', properties: {
    images: { type: 'array', items: { type: 'string', format: 'binary' } },
  }}})
  async addImage(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: any,
  ) {
    if (!files?.length) {
      throw new BadRequestException('At least one image file is required');
    }

    const [imagePath] = await this.imageService.processImages(files.slice(0, 1));
    const product = await this.productsService.addImage(
      id, imagePath, req.user?.sub, req.user?.role,
    );
    return { success: true, message: 'Image added', product };
  }

  @Delete(':id/images/:imageId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiOperation({ summary: 'Remove an image from a product' })
  async removeImage(
    @Param('id', ParseIntPipe) id: number,
    @Param('imageId', ParseIntPipe) imageId: number,
    @Req() req: any,
  ) {
    const product = await this.productsService.removeImage(
      id, imageId, req.user?.sub, req.user?.role,
    );
    return { success: true, message: 'Image removed', product };
  }

  @Post(':id/restore')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiOperation({ summary: 'Restore a deleted product' })
  async restore(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
  ) {
    await this.productsService.restore(id, req.user?.sub, req.user?.role);
    return { success: true, message: 'Product restored' };
  }

  private toNonNegativeInt(value: string | undefined, fallback: number): number {
    const n = Number.parseInt(value ?? '', 10);
    return Number.isNaN(n) ? fallback : n;
  }

  private parseSize(value: string | undefined): number | undefined {
    if (value === undefined) return undefined;
    const n = Number.parseInt(value, 10);
    return Number.isNaN(n) ? undefined : n;
  }

  private areSizesValid(dto: {
    sizeS?: number;
    sizeM?: number;
    sizeL?: number;
    sizeXl?: number;
    sizeXxl?: number;
  }): boolean {
    const sizes = [dto.sizeS, dto.sizeM, dto.sizeL, dto.sizeXl, dto.sizeXxl];
    return sizes.every((s) => s === undefined || (s >= 0 && Number.isFinite(s)));
  }
}
