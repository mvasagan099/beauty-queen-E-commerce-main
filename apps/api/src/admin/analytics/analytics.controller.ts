import { Controller, Get, Put, Body, Query, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AnalyticsService } from './analytics.service';
import { AnalyticsQueryDto } from './dto/analytics-query.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../../auth/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('Analytics')
@ApiBearerAuth()
@Controller()
export class AnalyticsController {
  constructor(private analyticsService: AnalyticsService) {}

  /* ------------------------- Admin analytics ------------------------- */

  @Get('admin/analytics/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin dashboard overview metrics' })
  async adminOverview(@Query() query: AnalyticsQueryDto) {
    const data = await this.analyticsService.getAdminOverview(query);
    return { success: true, data };
  }

  @Get('admin/analytics/sales')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin sales metrics' })
  async adminSales(@Query() query: AnalyticsQueryDto) {
    const data = await this.analyticsService.getAdminSales(query);
    return { success: true, data };
  }

  @Get('admin/analytics/orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin order metrics' })
  async adminOrders(@Query() query: AnalyticsQueryDto) {
    const data = await this.analyticsService.getAdminOrders(query);
    return { success: true, data };
  }

  @Get('admin/analytics/products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Admin product/inventory metrics' })
  async adminProducts(@Query() query: AnalyticsQueryDto) {
    const data = await this.analyticsService.getAdminProducts(query);
    return { success: true, data };
  }

  @Get('admin/analytics/low-stock-threshold')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get current low-stock threshold' })
  async lowStockThreshold() {
    const threshold = await this.analyticsService.getLowStockThresholdForConfig();
    return { success: true, data: { threshold } };
  }

  @Put('admin/analytics/low-stock-threshold')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update low-stock threshold (stored in SiteConfig)' })
  async updateLowStockThreshold(@Body('threshold') threshold: number) {
    const value = await this.analyticsService.setLowStockThreshold(threshold);
    return { success: true, data: { threshold: value } };
  }

  /* ------------------------- Seller analytics ------------------------ */

  @Get('seller/analytics/overview')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  @ApiOperation({ summary: 'Seller overview metrics (scoped to seller)' })
  async sellerOverview(@Request() req: any, @Query() query: AnalyticsQueryDto) {
    const data = await this.analyticsService.getSellerOverview(req.user.sub, query);
    return { success: true, data };
  }
}
