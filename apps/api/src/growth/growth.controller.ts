import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Body,
  Param,
  Query,
  ParseIntPipe,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GrowthService, FlashSaleBanner, ProductSwatch } from './growth.service';
import { AbandonedCartService } from './abandoned-cart.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { CsrfGuard } from '../common/csrf/csrf.guard';
import { Role } from '@prisma/client';

@ApiTags('Growth')
@Controller('growth')
export class GrowthController {
  constructor(
    private readonly growthService: GrowthService,
    private readonly abandonedCartService: AbandonedCartService,
  ) {}

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

  @Post('push/subscribe')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Register browser Web Push subscription for restock & price alerts' })
  async subscribePush(
    @Request() req: any,
    @Body() body: { endpoint?: string; keys?: { p256dh?: string; auth?: string } },
  ) {
    return this.growthService.savePushSubscription(req.user.sub, body);
  }

  @Delete('push/subscribe')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Remove browser Web Push subscription' })
  async unsubscribePush(@Request() req: any) {
    return this.growthService.removePushSubscription(req.user.sub);
  }

  @Post('push/expo-token')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Register Expo native push token (Android FCM / iOS APNs)' })
  async subscribeExpoPush(
    @Request() req: any,
    @Body() body: { token?: string; platform?: string; deviceName?: string },
  ) {
    return this.growthService.saveExpoPushToken(req.user.sub, body);
  }

  @Delete('push/expo-token')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Unregister Expo native push token' })
  async unsubscribeExpoPush(
    @Request() req: any,
    @Body() body?: { token?: string },
  ) {
    return this.growthService.removeExpoPushToken(req.user.sub, body?.token);
  }

  @Get('abandoned-carts/stats')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get count & value of idle carts eligible for recovery (admin)' })
  async abandonedCartStats(@Query('minIdleMinutes') minIdleMinutes?: string) {
    const mins = minIdleMinutes ? parseInt(minIdleMinutes, 10) || 120 : 120;
    const stats = await this.abandonedCartService.getStats(mins);
    return { success: true, ...stats };
  }

  @Post('abandoned-carts/run')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Trigger abandoned cart recovery sweep via Email + WhatsApp (admin)' })
  async runAbandonedCartSweep(@Body('minIdleMinutes') minIdleMinutes?: number) {
    const result = await this.abandonedCartService.runRecoverySweep(minIdleMinutes || 120);
    return { success: true, ...result };
  }

  @Post('stylist')
  @ApiOperation({ summary: 'Get curated Beauty Queen stylist recommendations from a natural prompt' })
  async stylist(@Body('prompt') prompt: string) {
    return this.growthService.getStylistRecommendations(prompt);
  }

  @Get('looks')
  @ApiOperation({ summary: 'Get curated "Shop the Look" outfit bundles' })
  async getLooks() {
    const looks = await this.growthService.getShopTheLookBundles();
    return { success: true, looks };
  }

  @Put('looks')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Save custom "Shop the Look" outfit bundles (admin)' })
  async saveLooks(@Body('looks') looks: any[]) {
    const saved = await this.growthService.saveShopTheLookBundles(looks);
    return { success: true, looks: saved };
  }
}
