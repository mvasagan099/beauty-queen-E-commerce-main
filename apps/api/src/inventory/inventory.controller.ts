import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  Req,
  Header,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InventoryService } from './inventory.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('Inventory')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SELLER, Role.ADMIN)
@Controller('inventory')
export class InventoryController {
  constructor(private inventoryService: InventoryService) {}

  @Post('bulk')
  @ApiOperation({ summary: 'Bulk update stock across products and sizes' })
  async bulkUpdate(
    @Body('updates') updates: { productId: number; size: string; quantity: number }[],
    @Req() req: any,
  ) {
    return this.inventoryService.bulkUpdateStock(updates, req.user?.sub, req.user?.role);
  }

  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="beauty-queen-inventory.csv"')
  @ApiOperation({ summary: 'Export seller/admin inventory as CSV' })
  async exportCsv(@Req() req: any) {
    return this.inventoryService.exportInventoryCsv(req.user?.sub, req.user?.role);
  }

  @Get(':productId')
  @ApiOperation({ summary: 'Get stock for a product' })
  async getStock(
    @Param('productId', ParseIntPipe) productId: number,
    @Req() req: any,
  ) {
    const stock = await this.inventoryService.getStock(productId, req.user?.sub, req.user?.role);
    return { success: true, ...stock };
  }

  @Put(':productId')
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
