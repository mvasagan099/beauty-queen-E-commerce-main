import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { RefundsService } from './refunds.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRefundDto } from './dto/refund.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { Role } from '@prisma/client';

@ApiTags('Refunds')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('refunds')
export class RefundsController {
  constructor(
    private refundsService: RefundsService,
    private prisma: PrismaService,
  ) {}

  @Post()
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Request a refund' })
  async createRefund(@Request() req: any, @Body() dto: CreateRefundDto) {
    const order = await this.prisma.order.findUnique({ where: { id: dto.orderId } });
    if (!order) throw new NotFoundException('Order not found');
    if (order.userId !== req.user.sub) throw new ForbiddenException('Not authorized');

    const refund = await this.refundsService.createRefund(
      req.user.sub,
      order.checkoutId!,
      Number(order.subtotal || 0),
    );
    return { success: true, refund };
  }

  @Get()
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Get my refunds' })
  async getMyRefunds(@Request() req: any) {
    const refunds = await this.refundsService.getMyRefunds(req.user.sub);
    return { success: true, refunds };
  }

  @Get('admin')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all refunds (admin)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  async getAllRefunds(
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const refunds = await this.refundsService.getAllRefunds({ status, search });
    return { success: true, refunds };
  }

  @Get(':id')
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Get refund by id' })
  async getRefund(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    const refund = await this.refundsService.getRefundById(id, req.user.sub);
    return { success: true, refund };
  }
}
