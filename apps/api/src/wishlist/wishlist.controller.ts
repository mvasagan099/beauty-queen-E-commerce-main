import { Controller, Get, Post, Delete, Body, UseGuards, Request, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { WishlistService } from './wishlist.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('Wishlist')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
@Controller('wishlist')
export class WishlistController {
  constructor(private wishlistService: WishlistService) {}

  @Get()
  @ApiOperation({ summary: 'Get wishlist' })
  async list(@Request() req: any) {
    const result = await this.wishlistService.list(req.user.sub);
    return { success: true, ...result };
  }

  @Post('toggle')
  @ApiOperation({ summary: 'Toggle wishlist item' })
  async toggle(@Request() req: any, @Body('productId') productId: number) {
    return this.wishlistService.toggle(req.user.sub, productId);
  }

  @Post(':productId/move-to-cart')
  @ApiOperation({ summary: 'Move a wishlist item to the cart' })
  async moveToCart(@Request() req: any, @Param('productId', ParseIntPipe) productId: number) {
    return this.wishlistService.moveToCart(req.user.sub, productId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear wishlist' })
  async clear(@Request() req: any) {
    return this.wishlistService.clear(req.user.sub);
  }
}
