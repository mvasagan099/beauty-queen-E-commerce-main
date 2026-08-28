import { Controller, Get, Put, Body, Param, Query, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('Admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private adminService: AdminService) {}

  @Get('dashboard')
  @ApiOperation({ summary: 'Get admin dashboard stats' })
  async getDashboard() {
    const dashboard = await this.adminService.getDashboard();
    return { success: true, ...dashboard };
  }

  @Get('sellers')
  @ApiOperation({ summary: 'Get all sellers' })
  async getAllSellers() {
    const sellers = await this.adminService.getAllSellers();
    return { success: true, sellers };
  }

  @Get('sellers/:id')
  @ApiOperation({ summary: 'Get seller details' })
  async getSeller(@Param('id', ParseIntPipe) id: number) {
    const seller = await this.adminService.getSeller(id);
    return { success: true, seller };
  }

  @Put('sellers/:id/status')
  @ApiOperation({ summary: 'Update seller active status' })
  async updateSellerStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('isActive') isActive: boolean,
  ) {
    return this.adminService.updateSellerStatus(id, isActive);
  }

  @Put('sellers/:id/role')
  @ApiOperation({ summary: 'Update user role' })
  async updateSellerRole(
    @Param('id', ParseIntPipe) id: number,
    @Body('role') role: Role,
  ) {
    return this.adminService.updateSellerRole(id, role);
  }

  @Get('products')
  @ApiOperation({ summary: 'Get all products' })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'category', required: false })
  @ApiQuery({ name: 'status', required: false })
  async getAllProducts(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('category') category?: string,
    @Query('status') status?: string,
  ) {
    const result = await this.adminService.getAllProducts({
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
      search,
      category,
      status,
    });
    return { success: true, ...result };
  }

  @Get('orders')
  @ApiOperation({ summary: 'Get all orders' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  async getAllOrders(
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const orders = await this.adminService.getAllOrders({ status, search });
    return { success: true, orders };
  }

  @Get('users')
  @ApiOperation({ summary: 'Get all users' })
  async getAllUsers() {
    const users = await this.adminService.getAllUsers();
    return { success: true, users };
  }

  @Get('users/:id')
  @ApiOperation({ summary: 'Get user details' })
  async getUser(@Param('id', ParseIntPipe) id: number) {
    const user = await this.adminService.getUser(id);
    return { success: true, user };
  }

  @Put('users/:id/role')
  @ApiOperation({ summary: 'Update user role' })
  async updateUserStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body('role') role: Role,
  ) {
    return this.adminService.updateUserStatus(id, role);
  }
}
