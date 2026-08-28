import { IsString, IsOptional, IsArray, ValidateNested, IsInt, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class PricingItemDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @IsNotEmpty()
  productId: number;

  @ApiProperty({ example: 'Medium' })
  @IsString()
  @IsNotEmpty()
  size: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @IsNotEmpty()
  quantity: number;
}

export class CalculatePricingDto {
  @ApiProperty({ type: [PricingItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PricingItemDto)
  @IsNotEmpty()
  items: PricingItemDto[];

  @ApiPropertyOptional({ example: 'SAVE10' })
  @IsString()
  @IsOptional()
  couponCode?: string;

  @ApiPropertyOptional({ example: '123456' })
  @IsString()
  @IsOptional()
  pincode?: string;

  @ApiPropertyOptional({ example: 'Chennai' })
  @IsString()
  @IsOptional()
  district?: string;
}
