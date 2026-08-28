import { Controller, Post, Body, UseGuards, Request } from '@nestjs/common';
import { IsEnum, IsOptional, ValidateNested, IsInt, IsNotEmpty, IsString, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { CheckoutService } from './checkout.service';
import { BuyNowCheckoutDto, CartCheckoutDto } from './dto/checkout.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { RateLimit, RateLimitGuard } from '../common/rate-limit.guard';
import { Role } from '@prisma/client';

class BuyNowItemDto {
  @IsInt()
  @IsNotEmpty()
  productId: number;

  @IsString()
  @IsNotEmpty()
  size: string;

  @IsInt()
  @Min(1)
  quantity: number;
}

class CheckoutPreviewDto {
  @IsEnum(['cart', 'buynow'])
  source: 'cart' | 'buynow';

  @IsOptional()
  @ValidateNested()
  @Type(() => BuyNowItemDto)
  buyNowItem?: BuyNowItemDto;

  @IsOptional()
  couponCode?: string;

  @IsOptional()
  pincode?: string;

  @IsOptional()
  district?: string;
}

@ApiTags('Checkout')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
@UseGuards(RateLimitGuard)
@Controller('checkout')
export class CheckoutController {
  constructor(private checkoutService: CheckoutService) {}

  @Post('preview')
  @RateLimit('checkout_preview', 30, 60)
  @ApiOperation({ summary: 'Preview pricing without placing an order' })
  async preview(@Request() req: any, @Body() dto: CheckoutPreviewDto) {
    const result = await this.checkoutService.preview(
      req.user.sub,
      dto.source,
      dto.buyNowItem,
      dto.couponCode,
      dto.pincode,
      dto.district,
    );
    return { success: true, ...result };
  }

  @Post('buynow')
  @RateLimit('checkout_buynow', 5, 60)
  @ApiOperation({ summary: 'Create order via Buy Now' })
  async buyNow(@Request() req: any, @Body() dto: BuyNowCheckoutDto) {
    const order = await this.checkoutService.createOrderFromBuyNow(
      req.user.sub,
      { sub: req.user.sub, email: req.user.email, name: req.user.name },
      {
        productId: dto.productId,
        size: dto.size,
        quantity: dto.quantity,
      },
      dto.address,
      dto.paymentMethod,
      dto.paymentId,
    );
    return { success: true, message: 'Order placed successfully', order };
  }

  @Post('cartbuynow')
  @RateLimit('checkout_cartbuynow', 5, 60)
  @ApiOperation({ summary: 'Create orders from cart' })
  async cartBuyNow(@Request() req: any, @Body() dto: CartCheckoutDto) {
    const orders = await this.checkoutService.createOrderFromCart(
      req.user.sub,
      { sub: req.user.sub, email: req.user.email, name: req.user.name },
      dto.address,
      dto.paymentMethod,
      dto.paymentId,
    );
    return { success: true, message: 'Orders placed successfully', orders };
  }
}
