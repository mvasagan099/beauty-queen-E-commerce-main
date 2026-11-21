import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  Header,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { ProductsService } from '../products/products.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

const MAX_LIMIT = 100;

function toPriceOrUndefined(value: number | undefined): number | undefined {
  if (value === undefined || value === null) return undefined;
  const num = Number(value);
  if (Number.isNaN(num)) return undefined;
  return Math.max(0, num);
}

@ApiTags('Categories')
@Controller('categories')
export class CategoriesController {
  constructor(
    private categoriesService: CategoriesService,
    private productsService: ProductsService,
  ) {}

  @Get()
  @Header('Cache-Control', 'public, max-age=300, stale-while-revalidate=600')
  @ApiOperation({ summary: 'Get all active categories & collections' })
  async getAll() {
    const categories = await this.categoriesService.getAll(false);
    return { success: true, categories };
  }

  @Get('admin/all')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all categories including inactive (admin)' })
  async getAllAdmin() {
    const categories = await this.categoriesService.getAll(true);
    return { success: true, categories };
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create a custom category/collection (admin)' })
  async create(
    @Body() body: { label: string; slug?: string; description?: string; active?: boolean },
  ) {
    const category = await this.categoriesService.create(body);
    return { success: true, category };
  }

  @Patch(':slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update a category/collection (admin)' })
  async update(
    @Param('slug') slug: string,
    @Body() body: { label?: string; description?: string; active?: boolean; sortOrder?: number },
  ) {
    const category = await this.categoriesService.update(slug, body);
    return { success: true, category };
  }

  @Delete(':slug')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete a custom category/collection (admin)' })
  async remove(@Param('slug') slug: string) {
    return this.categoriesService.remove(slug);
  }

  @Get(':slug/products')
  @ApiOperation({ summary: 'Get products for a category or collection' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'sort', required: false })
  @ApiQuery({ name: 'minPrice', required: false })
  @ApiQuery({ name: 'maxPrice', required: false })
  @ApiQuery({ name: 'size', required: false })
  async getProducts(
    @Param('slug') slug: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sort') sort?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
    @Query('size') size?: string,
  ) {
    const category = await this.categoriesService.getBySlug(slug);

    const safePage = Math.max(1, Math.floor(Number(page) || 1));
    const safeLimit = Math.min(MAX_LIMIT, Math.max(1, Math.floor(Number(limit) || 20)));
    const safeMinPrice = toPriceOrUndefined(minPrice);
    const safeMaxPrice = toPriceOrUndefined(maxPrice);

    const result = await this.productsService.findAll({
      category: slug,
      page: safePage,
      limit: safeLimit,
      sort,
      minPrice: safeMinPrice,
      maxPrice: safeMaxPrice,
      size: size?.trim() || undefined,
    });
    return { success: true, category, ...result };
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get category by slug' })
  async getBySlug(@Param('slug') slug: string) {
    const category = await this.categoriesService.getBySlug(slug);
    return { success: true, category };
  }
}
