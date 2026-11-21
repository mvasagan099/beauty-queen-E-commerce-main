import { Controller, Get, Post, Put, Body, Query, Headers, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
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
  @ApiOperation({ summary: 'Calculate shipping charge and delivery ETA by pincode' })
  @ApiQuery({ name: 'subtotal', required: false })
  @ApiQuery({ name: 'pincode', required: false })
  async calculate(
    @Query('subtotal') subtotalQuery?: string,
    @Query('pincode') pincodeQuery?: string,
    @Body() body?: { subtotal?: number; pincode?: string },
  ) {
    const rawSubtotal = subtotalQuery != null ? Number(subtotalQuery) : Number(body?.subtotal ?? 0);
    const subtotal = Number.isFinite(rawSubtotal) && rawSubtotal >= 0 ? rawSubtotal : 0;
    const pincode = (pincodeQuery ?? body?.pincode ?? '').trim();

    const isValidIndianPincode = /^[1-9]\d{5}$/.test(pincode);
    const charge = await this.shippingService.calculateShipping(
      subtotal,
      isValidIndianPincode ? pincode : undefined,
    );

    // Estimate delivery window based on Tamil Nadu origin (600–643) vs South India vs Pan-India
    let estimatedDays = '4–6 business days';
    if (isValidIndianPincode) {
      const prefix = Number(pincode.substring(0, 2));
      if (prefix >= 60 && prefix <= 64) {
        estimatedDays = '2–3 business days';
      } else if (prefix >= 50 && prefix <= 69) {
        estimatedDays = '3–4 business days';
      }
    }

    return {
      success: true,
      charge,
      freeShipping: charge === 0,
      serviceable: pincode ? isValidIndianPincode : true,
      estimatedDays,
      codAvailable: isValidIndianPincode,
    };
  }

  @Post('webhook')
  @ApiOperation({ summary: 'Receive courier tracking webhook updates (Shiprocket)' })
  async webhook(
    @Body() body: any,
    @Headers('x-api-key') apiKey?: string,
  ) {
    return this.shippingService.handleCourierWebhook(body || {}, apiKey);
  }
}
