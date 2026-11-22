import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GrowthService, FlashSaleBanner, ProductSwatch } from './growth.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { CsrfGuard } from '../common/csrf/csrf.guard';
import { Role } from '@prisma/client';

@ApiTags('Growth')
@Controller('growth')
export class GrowthController {
  constructor(private readonly growthService: GrowthService) {}

  @Get('banner')
  @ApiOperation({ summary: 'Get active storefront announcement / flash sale banner' })
  async getBanner() {
    const banner = await this.growthService.getBanner();
    return { success: true, banner };
  }

  @Put('banner')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update storefront announcement / flash sale banner (admin)' })
  async updateBanner(@Body() body: Partial<FlashSaleBanner>) {
    const banner = await this.growthService.updateBanner(body || {});
    return { success: true, banner };
  }

  @Get('loyalty')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Get Queen’s Circle loyalty tier, points, and referral code' })
  async getLoyalty(@Request() req: any) {
    const loyalty = await this.growthService.getLoyaltySummary(req.user.sub);
    return { success: true, loyalty };
  }

  @Post('loyalty/preview-redemption')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Preview Queen’s Circle loyalty points discount for a checkout subtotal' })
  async previewRedemption(@Request() req: any, @Body('subtotal') subtotal: number) {
    const preview = await this.growthService.previewPointsRedemption(req.user.sub, subtotal);
    return { success: true, ...preview };
  }

  @Post('loyalty/referral')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Redeem a friend’s Queen’s Circle referral code (+200 pts each)' })
  async applyReferral(@Request() req: any, @Body('code') code: string) {
    return this.growthService.applyReferralCode(req.user.sub, code);
  }

  @Get('products/:productId/swatches')
  @ApiOperation({ summary: 'Get color/shade swatches for a product' })
  async getProductSwatches(
    @Param('productId', ParseIntPipe) productId: number,
    @Query('category') category?: string,
  ) {
    const swatches = await this.growthService.getProductSwatches(productId, category);
    return { success: true, swatches };
  }

  @Put('products/:productId/swatches')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(Role.SELLER, Role.ADMIN)
  @ApiOperation({ summary: 'Save custom color/shade swatches for a product (seller/admin)' })
  async saveProductSwatches(
    @Param('productId', ParseIntPipe) productId: number,
    @Body('swatches') swatches: ProductSwatch[],
  ) {
    const saved = await this.growthService.saveProductSwatches(productId, swatches);
    return { success: true, swatches: saved };
  }

  @Post('stylist')
  @ApiOperation({ summary: 'Get curated Beauty Queen stylist recommendations from a natural prompt' })
  async stylist(@Body('prompt') prompt: string) {
    return this.growthService.getStylistRecommendations(prompt);
  }
}
