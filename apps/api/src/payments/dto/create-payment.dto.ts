import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsObject,
  IsNumber,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCheckoutDto {
  @ApiProperty({ example: 'cart' })
  @IsEnum(['cart', 'buynow'])
  @IsNotEmpty()
  source: 'cart' | 'buynow';

  @ApiPropertyOptional({ example: { productId: 1, size: 'Medium', quantity: 1 } })
  @IsOptional()
  buynowItem?: {
    productId: number;
    size: string;
    quantity: number;
  };

  @ApiPropertyOptional({ example: 'SAVE10' })
  @IsString()
  @IsOptional()
  couponCode?: string;

  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: '123 Main St' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  pincode: string;

  @ApiProperty({ example: 'Chennai' })
  @IsString()
  @IsNotEmpty()
  district: string;

  @ApiPropertyOptional({ example: 'Near park' })
  @IsString()
  @IsOptional()
  landmark?: string;

  @ApiProperty({ enum: ['cod', 'upi'], example: 'upi' })
  @IsEnum(['cod', 'upi'])
  @IsNotEmpty()
  paymentMethod: 'cod' | 'upi';
}

export class CreatePaymentOrderDto {
  @ApiProperty({ example: 'abc-123-checkout-id' })
  @IsString()
  @IsNotEmpty()
  checkoutId: string;
}

export class AdminRefundPaymentDto {
  @ApiProperty({ example: 500 })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiPropertyOptional({ example: 'Refund issued by admin' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ example: { scope: 'full' } })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class RetryPaymentDto {
  @ApiProperty({ example: 'abc-123-checkout-id' })
  @IsString()
  @IsNotEmpty()
  checkoutId: string;
}