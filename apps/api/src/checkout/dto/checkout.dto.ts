import {
  IsInt,
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  Min,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CheckoutAddressDto {
  @ApiProperty({ example: 'John Doe' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(255)
  name: string;

  @ApiProperty({ example: 'john@example.com' })
  @IsEmail()
  @IsNotEmpty()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[0-9+\-\s()]{10,15}$/, {
    message: 'phone must be a valid contact number',
  })
  phone: string;

  @ApiProperty({ example: '123 Main St' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(500)
  address: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[1-9][0-9]{5}$/, { message: 'pincode must be a valid 6-digit Indian pincode' })
  pincode: string;

  @ApiProperty({ example: 'Chennai' })
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  @MaxLength(100)
  district: string;

  @ApiPropertyOptional({ example: 'Near park' })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  landmark?: string;
}

export class BuyNowDto {
  @ApiProperty({ example: 10 })
  @IsInt()
  @IsNotEmpty()
  productId: number;

  @ApiProperty({ example: 'M' })
  @IsString()
  @IsNotEmpty()
  size: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity: number;
}

export class BuyNowCheckoutDto {
  @ApiProperty({ example: 10 })
  @IsInt()
  @IsNotEmpty()
  productId: number;

  @ApiProperty({ example: 'M' })
  @IsString()
  @IsNotEmpty()
  size: string;

  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiProperty()
  address: CheckoutAddressDto;

  @ApiProperty({ example: 'cod' })
  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  paymentId?: string;
}

export class CartCheckoutDto {
  @ApiProperty()
  address: CheckoutAddressDto;

  @ApiProperty({ example: 'cod' })
  @IsString()
  @IsNotEmpty()
  paymentMethod: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  paymentId?: string;
}
