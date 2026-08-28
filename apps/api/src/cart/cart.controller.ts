import { Controller, Get, Post, Put, Delete, Body, Param, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CartService } from './cart.service';
import { AddToCartDto, UpdateCartDto } from './dto/cart.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('Cart')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
@Controller('cart')
export class CartController {
  constructor(private cartService: CartService) {}

  @Get()
  @ApiOperation({ summary: 'Get cart with backend-calculated totals' })
  async getCart(@Request() req: any) {
    const result = await this.cartService.getCart(req.user.sub);
    return { success: true, data: result };
  }

  @Post()
  @ApiOperation({ summary: 'Add item to cart' })
  async addItem(@Request() req: any, @Body() dto: AddToCartDto) {
    const item = await this.cartService.addItem(req.user.sub, dto);
    return { success: true, message: 'Item added to cart', item };
  }

  @Put(':itemId')
  @ApiOperation({ summary: 'Update cart item quantity' })
  async updateQuantity(
    @Request() req: any,
    @Param('itemId', ParseIntPipe) itemId: number,
    @Body() dto: UpdateCartDto,
  ) {
    const item = await this.cartService.updateQuantity(req.user.sub, itemId, dto.quantity);
    return { success: true, message: 'Cart updated', item };
  }

  @Delete(':itemId')
  @ApiOperation({ summary: 'Remove item from cart' })
  async removeItem(
    @Request() req: any,
    @Param('itemId', ParseIntPipe) itemId: number,
  ) {
    return this.cartService.removeItem(req.user.sub, itemId);
  }

  @Delete()
  @ApiOperation({ summary: 'Clear cart' })
  async clearCart(@Request() req: any) {
    return this.cartService.clearCart(req.user.sub);
  }
}
