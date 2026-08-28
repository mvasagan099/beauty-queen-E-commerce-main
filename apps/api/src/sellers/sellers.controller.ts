import { Controller, Get, Post, Put, Res, Body, Param, Query, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { ConfigService } from '@nestjs/config';
import { SellersService } from './sellers.service';
import { SignupSellerDto, LoginSellerDto, UpdateSellerProfileDto } from './dto/seller.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { RateLimit, RateLimitGuard } from '../common/rate-limit.guard';
import { Role } from '@prisma/client';

@ApiTags('Sellers')
@Controller('sellers')
export class SellersController {
  constructor(
    private sellersService: SellersService,
    private configService: ConfigService,
  ) {}

  @Post('signup')
  @UseGuards(RateLimitGuard)
  @RateLimit('seller_signup', 10, 60 * 60)
  @ApiOperation({ summary: 'Seller signup' })
  async signup(@Body() dto: SignupSellerDto) {
    return this.sellersService.signup(dto);
  }

  @Post('login')
  @UseGuards(RateLimitGuard)
  @RateLimit('seller_login', 10, 15 * 60)
  @ApiOperation({ summary: 'Seller login' })
  async login(
    @Body() dto: LoginSellerDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.sellersService.login(dto);
    this.setTokenCookies(res, result.accessToken, result.refreshToken);
    return result;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  @ApiOperation({ summary: 'Seller logout' })
  async logout(@Request() req: any, @Res({ passthrough: true }) res: Response) {
    const result = await this.sellersService.logout(req.user.sub);
    res.clearCookie('access_token', { path: '/' });
    res.clearCookie('refresh_token', { path: '/' });
    return result;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  @ApiOperation({ summary: 'Get current seller profile' })
  async getProfile(@Request() req: any) {
    const profile = await this.sellersService.getProfile(req.user.sub);
    return { success: true, seller: profile };
  }

  @Get('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  @ApiOperation({ summary: 'Get seller profile' })
  async getProfileDetailed(@Request() req: any) {
    const profile = await this.sellersService.getProfile(req.user.sub);
    return { success: true, seller: profile };
  }

  @Put('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  @ApiOperation({ summary: 'Update seller profile' })
  async updateProfile(@Request() req: any, @Body() dto: UpdateSellerProfileDto) {
    return this.sellersService.updateProfile(req.user.sub, dto);
  }

  @Get('dashboard')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  @ApiOperation({ summary: 'Get seller dashboard stats' })
  async getDashboard(@Request() req: any) {
    const dashboard = await this.sellersService.getDashboard(req.user.sub);
    return { success: true, ...dashboard };
  }

  @Get('inventory')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  @ApiOperation({ summary: 'Get seller inventory with low-stock status' })
  async getInventory(@Request() req: any) {
    const result = await this.sellersService.getInventory(req.user.sub);
    return { success: true, ...result };
  }

  @Get('products')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  @ApiOperation({ summary: 'Get seller products' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  async getProducts(
    @Request() req: any,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
  ) {
    const result = await this.sellersService.getProducts(req.user.sub, {
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
    });
    return { success: true, ...result };
  }

  @Get('products/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  @ApiOperation({ summary: 'Get seller product by ID' })
  async getProduct(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    const product = await this.sellersService.getProduct(req.user.sub, id);
    return { success: true, product };
  }

  @Get('orders')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  @ApiOperation({ summary: 'Get seller orders' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  async getOrders(
    @Request() req: any,
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const orders = await this.sellersService.getOrders(req.user.sub, { status, search });
    return { success: true, orders };
  }

  @Get('orders/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  @ApiOperation({ summary: 'Get seller order by ID' })
  async getOrder(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    const order = await this.sellersService.getOrder(req.user.sub, id);
    return { success: true, order };
  }

  @Put('orders/:id/status')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.SELLER)
  @ApiOperation({ summary: 'Update seller order status' })
  async updateOrderStatus(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body('status') status: string,
  ) {
    return this.sellersService.updateOrderStatus(req.user.sub, id, status);
  }

  private setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
    const isProduction = process.env.NODE_ENV === 'production';
    res.cookie('access_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000,
      path: '/',
    });
    res.cookie('refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
      path: '/',
    });
  }
}
