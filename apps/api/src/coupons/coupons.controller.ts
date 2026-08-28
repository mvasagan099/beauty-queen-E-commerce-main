import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { CouponsService } from './coupons.service';
import { CreateCouponDto, UpdateCouponDto, ApplyCouponDto } from './dto/coupon.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('Coupons')
@Controller('coupons')
export class CouponsController {
  constructor(private couponsService: CouponsService) {}

  @Post('validate')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Validate a coupon code' })
  async validate(
    @Request() req: any,
    @Body('code') code: string,
    @Body('amount') amount: number,
  ) {
    return this.couponsService.validate(code, amount, req.user.sub);
  }

  @Post('apply')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Apply a coupon code' })
  async apply(@Request() req: any, @Body() dto: ApplyCouponDto) {
    return this.couponsService.apply(dto.code, req.user.sub);
  }

  @Post('remove')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Remove applied coupon' })
  async remove(@Request() req: any, @Body('code') code: string) {
    await this.couponsService.releaseCoupon(code, req.user.sub);
    return { success: true, message: 'Coupon removed' };
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all coupons (admin)' })
  @ApiQuery({ name: 'active', required: false })
  @ApiQuery({ name: 'search', required: false })
  async findAll(
    @Query('active') active?: string,
    @Query('search') search?: string,
  ) {
    const filters: any = {};
    if (active !== undefined) filters.active = active === 'true';
    if (search) filters.search = search;
    const coupons = await this.couponsService.findAll(filters);
    return { success: true, coupons };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get coupon by id (admin)' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    const coupon = await this.couponsService.findOne(id);
    return { success: true, coupon };
  }

  @Post('admin')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Create coupon (admin)' })
  async create(@Body() dto: CreateCouponDto) {
    const coupon = await this.couponsService.create(dto);
    return { success: true, coupon };
  }

  @Patch('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update coupon (admin)' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCouponDto,
  ) {
    const coupon = await this.couponsService.update(id, dto);
    return { success: true, coupon };
  }

  @Delete('admin/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Delete coupon (admin)' })
  async removeAdmin(@Param('id', ParseIntPipe) id: number) {
    return this.couponsService.remove(id);
  }
}
