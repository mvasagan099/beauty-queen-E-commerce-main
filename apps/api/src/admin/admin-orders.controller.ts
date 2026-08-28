import { Controller, Get, Patch, Param, Body, Query, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from '../orders/orders.service';
import { UpdateOrderStatusDto, OrderQueryDto } from '../orders/dto/order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('Admin Orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/orders')
export class AdminOrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Get all orders (admin)' })
  async getAllOrders(@Query() query: OrderQueryDto) {
    const result = await this.ordersService.getAllOrders(
      {
        status: query.status,
        search: query.search,
        paymentStatus: query.paymentStatus,
        dateFrom: query.dateFrom,
        dateTo: query.dateTo,
        page: query.page,
        limit: query.limit,
      },
    );
    return { success: true, ...result };
  }

  @Get('dashboard')
  @ApiOperation({ summary: 'Get order dashboard stats' })
  async getDashboard() {
    const dashboard = await this.ordersService.getDashboard();
    return { success: true, ...dashboard };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details (admin)' })
  async getOrder(@Param('id', ParseIntPipe) id: number) {
    const order = await this.ordersService.getOrderById(id);
    return { success: true, order };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status (admin)' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
    @Request() req: any,
  ) {
    const order = await this.ordersService.updateOrderStatus(id, dto.status, req.user.sub);
    return { success: true, message: 'Order status updated', order };
  }

  @Get(':id/history')
  @ApiOperation({ summary: 'Get order status history (admin)' })
  async getStatusHistory(@Param('id', ParseIntPipe) id: number) {
    const history = await this.ordersService.getStatusHistory(id);
    return { success: true, history };
  }
}
