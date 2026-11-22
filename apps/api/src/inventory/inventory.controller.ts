import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  Req,
  Header,
  BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { StockReservationService, StockReservationItem } from './stock-reservation.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { CsrfGuard } from '../common/csrf/csrf.guard';
import { Role } from '@prisma/client';

@ApiTags('Inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inventory')
export class InventoryController {
  constructor(
    private inventoryService: InventoryService,
    private stockReservationService: StockReservationService,
  ) {}

  @Post('reserve')
  @UseGuards(CsrfGuard)
  @Roles(Role.CUSTOMER, Role.ADMIN)
  @ApiOperation({ summary: 'Reserve stock in Redis for 10 minutes during checkout' })
  async reserveStock(
    @Body() body: { checkoutId?: string; items: StockReservationItem[] },
    @Req() req: any,
  ) {
    if (!Array.isArray(body?.items) || body.items.length === 0) {
      throw new BadRequestException('At least one item is required to reserve stock');
    }
    const key = body.checkoutId?.trim() || `user:${req.user.sub}`;
    const reservation = await this.stockReservationService.reserve(key, body.items);
    return { success: true, reservation };
  }

  @Delete('reserve/:checkoutId')
  @UseGuards(CsrfGuard)
  @Roles(Role.CUSTOMER, Role.ADMIN)
  @ApiOperation({ summary: 'Release an active checkout stock reservation' })
  async releaseStock(@Param('checkoutId') checkoutId: string) {
    await this.stockReservationService.release(checkoutId);
    return { success: true, released: checkoutId };
  }

  @Post('bulk')
  @UseGuards(CsrfGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiOperation({ summary: 'Bulk update stock across products and sizes' })
  async bulkUpdate(
    @Body('updates') updates: { productId: number; size: string; quantity: number }[],
    @Req() req: any,
  ) {
    return this.inventoryService.bulkUpdateStock(updates, req.user?.sub, req.user?.role);
  }

  @Get('export')
  @Roles(Role.SELLER, Role.ADMIN)
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="beauty-queen-inventory.csv"')
  @ApiOperation({ summary: 'Export seller/admin inventory as CSV' })
  async exportCsv(@Req() req: any) {
    return this.inventoryService.exportInventoryCsv(req.user?.sub, req.user?.role);
  }

  @Get(':productId')
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiOperation({ summary: 'Get stock for a product' })
  async getStock(
    @Param('productId', ParseIntPipe) productId: number,
    @Req() req: any,
  ) {
    const stock = await this.inventoryService.getStock(productId, req.user?.sub, req.user?.role);
    return { success: true, ...stock };
  }

  @Put(':productId')
  @UseGuards(CsrfGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiOperation({ summary: 'Update stock for a product size' })
  async updateStock(
    @Param('productId', ParseIntPipe) productId: number,
    @Body('size') size: string,
    @Body('quantity') quantity: number,
    @Req() req: any,
  ) {
    return this.inventoryService.updateStock(productId, size, quantity, req.user?.sub, req.user?.role);
  }
}
