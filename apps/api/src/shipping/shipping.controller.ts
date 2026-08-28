import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ShippingService } from './shipping.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('Shipping')
@Controller('shipping')
export class ShippingController {
  constructor(private shippingService: ShippingService) {}

  @Get('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get shipping config (admin)' })
  async getConfig() {
    const config = await this.shippingService.getConfig();
    return { success: true, config };
  }

  @Put('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update shipping config (admin)' })
  async updateConfig(@Body() body: any) {
    return this.shippingService.updateConfig(body);
  }

  @Get('calculate')
  @ApiOperation({ summary: 'Calculate shipping charge' })
  async calculate(@Body() body: { subtotal: number; pincode?: string }) {
    const charge = await this.shippingService.calculateShipping(body.subtotal, body.pincode);
    return { success: true, charge, freeShipping: charge === 0 };
  }
}
