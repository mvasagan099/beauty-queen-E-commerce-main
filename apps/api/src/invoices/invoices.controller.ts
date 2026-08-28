import { Controller, Get, Param, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InvoicesService } from './invoices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('Invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(private invoicesService: InvoicesService) {}

  @Get('mine')
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Get my invoices' })
  async getMyInvoices(@Request() req: any) {
    const invoices = await this.invoicesService.getMyInvoices(req.user.sub);
    return { success: true, invoices };
  }

  @Get('admin')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all invoices (admin)' })
  async getAllInvoices() {
    const invoices = await this.invoicesService.getAllInvoices();
    return { success: true, invoices };
  }

  @Get('order/:id')
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Get invoice for an order (owner only)' })
  async getByOrder(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
  ) {
    const invoice = await this.invoicesService.getForOrder(id, {
      sub: req.user.sub,
      email: req.user.email,
    });
    return { success: true, invoice };
  }
}
