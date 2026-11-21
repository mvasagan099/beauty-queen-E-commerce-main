import { IsInt, IsString, IsNotEmpty, Min, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({ example: 1 })
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

export class UpdateCartDto {
  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: 'L' })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  size?: string;
}
