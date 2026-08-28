import { Controller, Get, Param, Req, Res, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiProduces } from '@nestjs/swagger';
import { Response } from 'express';
import { AdminExportsService } from './admin-exports.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('Admin Exports')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/exports')
export class AdminExportsController {
  constructor(private exportsService: AdminExportsService) {}

  @Get(':resource')
  @ApiOperation({ summary: 'Export a resource as CSV (orders/products/customers/refunds/sales)' })
  @ApiParam({ name: 'resource', enum: AdminExportsService.resources() })
  @ApiProduces('text/csv')
  async exportCsv(@Param('resource') resource: string, @Req() req: any, @Res() res: Response) {
    if (!this.exportsService.isSupported(resource)) {
      res.status(400).json({ success: false, message: `Unsupported export resource: ${resource}` });
      return;
    }

    const filename = `${resource}-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    // UTF-8 BOM so Excel reads the CSV correctly.
    res.write('\uFEFF');

    await this.exportsService.logExport(req.user?.sub, resource);

    try {
      for await (const line of this.exportsService.stream(resource)) {
        res.write(line + '\r\n');
      }
      res.end();
    } catch (error) {
      res.status(500);
      res.write('export failed');
      res.end();
    }
  }
}