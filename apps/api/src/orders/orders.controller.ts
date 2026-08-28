import { Controller, Get, Post, Put, Delete, Body, Param, Query, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { OrdersService } from './orders.service';
import { UpdateOrderStatusDto, CancelOrderDto } from './dto/order.dto';
import { InvoicesService } from '../invoices/invoices.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('Orders')
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(
    private ordersService: OrdersService,
    private invoicesService: InvoicesService,
  ) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Get orders for current user' })
  async getUserOrders(@Request() req: any) {
    const orders = await this.ordersService.getOrdersByUser({
      sub: req.user.sub,
      email: req.user.email,
    });
    return { success: true, orders };
  }

  @Get('all')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all orders (admin)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  async getAllOrders(
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const orders = await this.ordersService.getAllOrders({ status, search });
    return { success: true, orders };
  }

  @Get('dashboard')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get order dashboard stats' })
  async getDashboard() {
    const dashboard = await this.ordersService.getDashboard();
    return { success: true, ...dashboard };
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Get order by ID (owner only)' })
  async getOrder(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const order = await this.ordersService.getCustomerOrder(id, {
      sub: req.user.sub,
      email: req.user.email,
    });
    return { success: true, order };
  }

  @Post(':id/cancel')
  @UseGuards(RolesGuard)
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Cancel order (customer, owner only)' })
  async cancelOrder(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CancelOrderDto,
    @Request() req: any,
  ) {
    const result = await this.ordersService.cancelOrder(
      id,
      req.user.sub,
      dto.reason,
    );
    return {
      success: true,
      message: result.alreadyCancelled
        ? 'Order is already cancelled'
        : 'Order cancelled successfully',
      ...result,
    };
  }

  @Get(':id/tracking')
  @UseGuards(RolesGuard)
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Get order tracking (owner only)' })
  async getTracking(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    const tracking = await this.ordersService.getTracking(id, {
      sub: req.user.sub,
      email: req.user.email,
    });
    return { success: true, tracking };
  }

  @Get(':id/invoice')
  @UseGuards(RolesGuard)
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Get invoice for order (owner only)' })
  async getInvoice(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: any,
  ) {
    const result = await this.invoicesService.generateForOrder({
      orderId: id,
      requestedBy: { sub: req.user.sub, email: req.user.email },
    });
    return { success: true, invoice: result.invoice, invoiceNumber: result.invoiceNumber, items: result.items };
  }

  @Put(':id/status')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update order status (admin)' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
    @Request() req: any,
  ) {
    const order = await this.ordersService.updateOrderStatus(id, dto.status, req.user.sub);
    return { success: true, message: 'Order status updated', order };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete order (admin)' })
  async deleteOrder(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.deleteOrder(id);
  }

  @Get(':id/history')
  @UseGuards(RolesGuard)
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Get order status history (owner only)' })
  async getStatusHistory(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const history = await this.ordersService.getStatusHistory(id, {
      sub: req.user.sub,
      email: req.user.email,
    });
    return { success: true, history };
  }
}
