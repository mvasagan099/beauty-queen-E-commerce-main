import { IsOptional, IsString, IsInt, Min, MaxLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateStockAlertDto {
  @ApiPropertyOptional({ example: 'Small', description: 'Requested size tracked for the alert (informational)' })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  size?: string;
}

export class CreatePriceAlertDto {
  @ApiProperty({ example: 999, description: 'Price in rupees at or below which the user wants to be notified' })
  @IsInt()
  @Min(1)
  watchedPrice: number;
}