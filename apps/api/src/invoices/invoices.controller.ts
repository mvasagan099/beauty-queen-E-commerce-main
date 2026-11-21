import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
  Res,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { InvoicesService } from './invoices.service';
import { InvoicePdfService, GstInvoicePayload } from './invoice-pdf.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('Invoices')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('invoices')
export class InvoicesController {
  constructor(
    private invoicesService: InvoicesService,
    private invoicePdfService: InvoicePdfService,
  ) {}

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

  @Get('order/:id/pdf')
  @Roles(Role.CUSTOMER, Role.ADMIN)
  @ApiOperation({ summary: 'Download GST-compliant PDF tax invoice for an order' })
  async downloadOrderPdf(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const payload = await this.resolveInvoicePayload(id, req);
    const pdfBuffer = this.invoicePdfService.generatePdf(payload);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="Invoice-${payload.invoiceNumber}.pdf"`,
    );
    res.setHeader('Content-Length', String(pdfBuffer.length));
    res.send(pdfBuffer);
  }

  @Get('order/:id/html')
  @Roles(Role.CUSTOMER, Role.ADMIN)
  @ApiOperation({ summary: 'Render printable HTML GST tax invoice for an order' })
  async renderOrderHtml(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Res() res: Response,
  ) {
    const payload = await this.resolveInvoicePayload(id, req);
    const html = this.invoicePdfService.renderHtmlInvoice(payload);

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
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

  private async resolveInvoicePayload(orderId: number, req: any): Promise<GstInvoicePayload> {
    const isAdmin = req.user?.role === Role.ADMIN;
    const generated = await this.invoicesService.generateForOrder({
      orderId,
      requestedBy: { sub: req.user.sub, email: req.user.email || '' },
      isAdmin,
    });
    const inv = generated.invoice;
    return {
      invoiceNumber: inv.invoiceNumber,
      orderId: inv.orderId,
      issuedAt: inv.createdAt || new Date(),
      recipientName: inv.recipientName,
      recipientEmail: inv.recipientEmail,
      billingAddress: inv.billingAddress || null,
      items: Array.isArray(inv.items) ? inv.items : [],
      subtotal: Number(inv.subtotal || 0),
      discountAmount: Number(inv.discountAmount || 0),
      couponCode: inv.couponCode || null,
      couponDiscount: Number(inv.couponDiscount || 0),
      shippingAmount: Number(inv.shippingAmount || 0),
      taxAmount: Number(inv.taxAmount || 0),
      totalAmount: Number(inv.totalAmount || 0),
      paymentMethod: inv.paymentMethod || null,
      paymentStatus: inv.paymentStatus || null,
    };
  }
}
