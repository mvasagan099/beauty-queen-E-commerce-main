import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { Role } from '@prisma/client';
import { FinanceService } from './finance.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { CsrfGuard } from '../common/csrf/csrf.guard';

@ApiTags('Finance')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('finance')
export class FinanceController {
  constructor(private readonly financeService: FinanceService) {}

  @Get('seller/payouts')
  @Roles(Role.SELLER)
  @ApiOperation({ summary: 'Get logged-in seller earnings, commission fee, and payout settlements' })
  async getMySellerPayouts(@Request() req: any) {
    const ledger = await this.financeService.getSellerLedger(req.user.sub);
    return { success: true, ledger };
  }

  @Get('admin/payouts')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all sellers commission & payout settlement ledger (admin)' })
  async getAllSellerPayouts() {
    const data = await this.financeService.getAllSellerLedgers();
    return { success: true, ...data };
  }

  @Post('admin/payouts')
  @UseGuards(CsrfGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Record a seller payout settlement with UTR bank reference (admin)' })
  async recordSellerPayout(
    @Request() req: any,
    @Body()
    body: {
      sellerId: number;
      amount: number;
      utrReference: string;
      note?: string;
    },
  ) {
    const payout = await this.financeService.recordPayout({
      sellerId: Number(body.sellerId),
      amount: Number(body.amount),
      utrReference: body.utrReference,
      note: body.note,
      adminUserId: req.user?.sub,
    });
    return { success: true, payout };
  }

  @Get('admin/gstr1')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Generate Indian GST GSTR-1 monthly HSN summary (JSON or CSV)' })
  async exportGstr1(
    @Query('month') month: string | undefined,
    @Query('format') format: string | undefined,
    @Res({ passthrough: true }) res: Response,
  ) {
    const report = await this.financeService.generateGstr1Report(month);
    if ((format || '').toLowerCase() === 'csv') {
      const csv = this.financeService.formatGstr1Csv(report);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="beauty-queen-gstr1-${report.month}.csv"`,
      );
      return csv;
    }
    return { success: true, report };
  }
}
