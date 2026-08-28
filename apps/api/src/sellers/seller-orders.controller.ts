import { Controller, Get, Patch, Param, Body, Query, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { OrdersService } from '../orders/orders.service';
import { UpdateOrderStatusDto, OrderQueryDto } from '../orders/dto/order.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('Seller Orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.SELLER)
@Controller('seller/orders')
export class SellerOrdersController {
  constructor(private ordersService: OrdersService) {}

  @Get()
  @ApiOperation({ summary: 'Get seller orders' })
  async getSellerOrders(@Request() req: any, @Query() query: OrderQueryDto) {
    const result = await this.ordersService.getSellerOrders(
      req.user.sub,
      {
        status: query.status,
        search: query.search,
        paymentStatus: query.paymentStatus,
        page: query.page,
        limit: query.limit,
      },
    );
    return { success: true, ...result };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update order status (seller)' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
    @Request() req: any,
  ) {
    const order = await this.ordersService.updateOrderStatusBySeller(id, dto.status, req.user.sub);
    return { success: true, message: 'Order status updated', order };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get order details (seller, own orders only)' })
  async getOrder(@Param('id', ParseIntPipe) id: number, @Request() req: any) {
    const order = await this.ordersService.getSellerOrder(id, req.user.sub);
    return { success: true, order };
  }
}
