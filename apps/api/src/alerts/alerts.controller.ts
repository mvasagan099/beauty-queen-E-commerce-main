import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam } from '@nestjs/swagger';
import { AlertsService } from './alerts.service';
import { CreateStockAlertDto, CreatePriceAlertDto } from './dto/alerts.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Alerts')
@Controller()
@UseGuards(JwtAuthGuard)
export class AlertsController {
  constructor(private alertsService: AlertsService) {}

  @Get('alerts')
  @ApiOperation({ summary: 'List my back-in-stock and price-drop alerts' })
  async list(@Request() req: any) {
    const alerts = await this.alertsService.listMyAlerts(req.user.sub);
    return { success: true, ...alerts };
  }

  @Post('products/:id/stock-alert')
  @ApiOperation({ summary: 'Create a back-in-stock alert for an out-of-stock product' })
  @ApiParam({ name: 'id', type: Number })
  async createStockAlert(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateStockAlertDto,
  ) {
    return this.alertsService.createStockAlert(req.user.sub, id, req.user.email, dto.size);
  }

  @Get('products/:id/stock-alert')
  @ApiOperation({ summary: 'Get my back-in-stock alert status for a product' })
  @ApiParam({ name: 'id', type: Number })
  async getStockAlert(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    const alert = await this.alertsService.getStockAlert(req.user.sub, id);
    return { success: true, alert };
  }

  @Delete('products/:id/stock-alert')
  @ApiOperation({ summary: 'Cancel my back-in-stock alert for a product' })
  @ApiParam({ name: 'id', type: Number })
  async cancelStockAlert(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.alertsService.cancelStockAlert(req.user.sub, id);
  }

  @Post('wishlist/:productId/price-alert')
  @ApiOperation({ summary: 'Create a price-drop alert for a product' })
  @ApiParam({ name: 'productId', type: Number })
  async createPriceAlert(
    @Request() req: any,
    @Param('productId', ParseIntPipe) productId: number,
    @Body() dto: CreatePriceAlertDto,
  ) {
    return this.alertsService.createPriceAlert(req.user.sub, productId, dto.watchedPrice);
  }

  @Delete('wishlist/:productId/price-alert')
  @ApiOperation({ summary: 'Cancel my price-drop alert for a product' })
  @ApiParam({ name: 'productId', type: Number })
  async cancelPriceAlert(@Request() req: any, @Param('productId', ParseIntPipe) productId: number) {
    return this.alertsService.cancelPriceAlert(req.user.sub, productId);
  }
}