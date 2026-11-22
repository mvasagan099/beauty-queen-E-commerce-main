import {
  Controller,
  Get,
  Put,
  Post,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { GrowthService, FlashSaleBanner } from './growth.service';
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

  @Post('loyalty/referral')
  @UseGuards(JwtAuthGuard, RolesGuard, CsrfGuard)
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Redeem a friend’s Queen’s Circle referral code (+200 pts each)' })
  async applyReferral(@Request() req: any, @Body('code') code: string) {
    return this.growthService.applyReferralCode(req.user.sub, code);
  }

  @Post('stylist')
  @ApiOperation({ summary: 'Get curated Beauty Queen stylist recommendations from a natural prompt' })
  async stylist(@Body('prompt') prompt: string) {
    return this.growthService.getStylistRecommendations(prompt);
  }
}
