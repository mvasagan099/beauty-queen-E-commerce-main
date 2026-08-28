import { IsString, IsNotEmpty, IsOptional, IsInt, IsBoolean, MaxLength, Min, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketStatus } from '@prisma/client';

export class CreateSupportTicketDto {
  @ApiProperty({ example: 'Where is my order?' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  subject: string;

  @ApiProperty({ example: 'I placed an order 3 days ago but have not received any shipping update.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  body: string;

  @ApiPropertyOptional({ example: 42 })
  @IsOptional()
  @IsInt()
  @Min(1)
  orderId?: number;
}

export class ReplySupportTicketDto {
  @ApiProperty({ example: 'Any update on this? Thanks.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  body: string;
}

export class AdminReplySupportTicketDto {
  @ApiProperty({ example: 'We have escalated this to our logistics team.' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(5000)
  body: string;

  @ApiPropertyOptional({ example: true, description: 'Internal note, never visible to the customer' })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}

export class UpdateTicketStatusDto {
  @ApiProperty({ enum: TicketStatus })
  @IsEnum(TicketStatus)
  status: TicketStatus;
}