import { IsBoolean, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateNotificationPreferencesDto {
  @ApiPropertyOptional({ example: true, description: 'Email/in-app order status updates' })
  @IsOptional()
  @IsBoolean()
  orderUpdates?: boolean;

  @ApiPropertyOptional({ example: true, description: 'Email/in-app payment updates' })
  @IsOptional()
  @IsBoolean()
  paymentUpdates?: boolean;

  @ApiPropertyOptional({ example: false, description: 'Promotional/marketing email (abandoned-cart, offers)' })
  @IsOptional()
  @IsBoolean()
  promotional?: boolean;
}