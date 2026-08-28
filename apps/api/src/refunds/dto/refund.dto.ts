import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRefundDto {
  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  orderId: number;

  @ApiPropertyOptional({ example: 'Customer returned product' })
  @IsString()
  @IsOptional()
  reason?: string;
}

export class AdminRefundDto {
  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  checkoutId: number;

  @ApiProperty({ example: 500 })
  @IsNumber()
  @IsNotEmpty()
  amount: number;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  returnRequestId?: number;
}
