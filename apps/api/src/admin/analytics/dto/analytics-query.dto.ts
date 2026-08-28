import { IsOptional, IsIn, Matches } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export const DATE_RANGES = ['today', '7d', '30d', '90d', 'month', 'custom'] as const;
export type DateRange = (typeof DATE_RANGES)[number];

export class AnalyticsQueryDto {
  @ApiPropertyOptional({ enum: DATE_RANGES, description: 'Date range filter' })
  @IsOptional()
  @IsIn(DATE_RANGES)
  range?: DateRange;

  @ApiPropertyOptional({ description: 'Custom range start (YYYY-MM-DD)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'from must be YYYY-MM-DD' })
  from?: string;

  @ApiPropertyOptional({ description: 'Custom range end (YYYY-MM-DD, inclusive)' })
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'to must be YYYY-MM-DD' })
  to?: string;
}
