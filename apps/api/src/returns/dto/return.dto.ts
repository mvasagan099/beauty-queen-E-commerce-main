import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReturnDto {
  @ApiProperty({ example: 1 })
  @IsNotEmpty()
  orderId: number;

  @ApiProperty({ example: 'Product does not match description' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  @ApiPropertyOptional({ example: 'Size was too small' })
  @IsString()
  @IsOptional()
  note?: string;
}

export class UpdateReturnDto {
  @ApiProperty({ enum: ['APPROVED', 'REJECTED', 'PICKUP_PENDING', 'RECEIVED', 'COMPLETED', 'CANCELLED'] })
  @IsString()
  @IsNotEmpty()
  status: string;

  @ApiPropertyOptional({ example: 'Return approved' })
  @IsString()
  @IsOptional()
  note?: string;
}
