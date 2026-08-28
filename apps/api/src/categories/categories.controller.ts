import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { ProductsService } from '../products/products.service';

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
  @ApiOperation({ summary: 'Get all categories' })
  getAll() {
    const categories = this.categoriesService.getAll();
    return { success: true, categories };
  }

  @Get(':slug/products')
  @ApiOperation({ summary: 'Get products for a category' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'sort', required: false })
  @ApiQuery({ name: 'minPrice', required: false })
  @ApiQuery({ name: 'maxPrice', required: false })
  async getProducts(
    @Param('slug') slug: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('sort') sort?: string,
    @Query('minPrice') minPrice?: number,
    @Query('maxPrice') maxPrice?: number,
  ) {
    this.categoriesService.getBySlug(slug);

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
    });
    return { success: true, category: this.categoriesService.getBySlug(slug), ...result };
  }

  @Get(':slug')
  @ApiOperation({ summary: 'Get category by slug' })
  getBySlug(@Param('slug') slug: string) {
    const category = this.categoriesService.getBySlug(slug);
    return { success: true, category };
  }
}
