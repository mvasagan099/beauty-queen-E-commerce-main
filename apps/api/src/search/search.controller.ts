import { Controller, Get, Query, DefaultValuePipe, ParseIntPipe, UseInterceptors } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { SearchService } from './search.service';
import { SearchRateLimitInterceptor } from '../common/interceptors/rate-limit.interceptor';

@ApiTags('Search')
@Controller('search')
export class SearchController {
  constructor(private searchService: SearchService) {}

  @Get('suggestions')
  @UseInterceptors(SearchRateLimitInterceptor)
  @ApiOperation({ summary: 'Type-ahead suggestions (products + categories)' })
  @ApiQuery({ name: 'q', required: true })
  @ApiQuery({ name: 'limit', required: false, description: 'Max suggestions (default 5, max 10)' })
  async suggestions(@Query('q') q: string, @Query('limit') limit?: string) {
    const safeQ = q ? q.trim().substring(0, 200) : '';
    const safeLimit = Math.min(10, Math.max(1, Math.floor(Number(limit) || 5)));
    const { products, categories } = await this.searchService.suggestions(safeQ, safeLimit);
    return { success: true, products, categories };
  }

  @Get('popular')
  @ApiOperation({ summary: 'Popular search terms (from search analytics)' })
  @ApiQuery({ name: 'limit', required: false, description: 'Max terms (default 10, max 50)' })
  @ApiQuery({ name: 'days', required: false, description: 'Lookback window (default 30)' })
  async popular(
    @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number,
    @Query('days', new DefaultValuePipe(30), ParseIntPipe) days: number,
  ) {
    const terms = await this.searchService.getPopularSearches(limit, days);
    return { success: true, terms };
  }
}