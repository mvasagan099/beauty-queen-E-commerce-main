import { Controller, Get, Put, Param, Body, UseGuards, ParseIntPipe, Req } from '@nestjs/common';
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
