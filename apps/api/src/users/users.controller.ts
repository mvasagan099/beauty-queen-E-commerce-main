import { Controller, Get, Put, Patch, Post, Delete, Body, Param, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { UsersService } from './users.service';
import { UpdateUserDto, CreateAddressDto, UpdateAddressDto } from './dto/user.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('Users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Request() req: any) {
    const profile = await this.usersService.getProfile(req.user.sub);
    return { success: true, user: profile };
  }

  @Patch('me')
  @ApiOperation({ summary: 'Update current user profile' })
  async updateProfile(@Request() req: any, @Body() dto: UpdateUserDto) {
    return this.usersService.updateProfile(req.user.sub, dto);
  }

  @Get('addresses')
  @ApiOperation({ summary: 'Get user addresses' })
  async getAddresses(@Request() req: any) {
    const addresses = await this.usersService.getAddresses(req.user.sub);
    return { success: true, addresses };
  }

  @Get('addresses/:id')
  @ApiOperation({ summary: 'Get single address' })
  async getAddress(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    const address = await this.usersService.getAddress(req.user.sub, id);
    return { success: true, address };
  }

  @Post('addresses')
  @ApiOperation({ summary: 'Create address' })
  async createAddress(@Request() req: any, @Body() dto: CreateAddressDto) {
    return this.usersService.createAddress(req.user.sub, dto);
  }

  @Patch('addresses/:id')
  @ApiOperation({ summary: 'Update address' })
  async updateAddress(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateAddressDto,
  ) {
    return this.usersService.updateAddress(req.user.sub, id, dto);
  }

  @Patch('addresses/:id/default')
  @ApiOperation({ summary: 'Set address as default' })
  async setDefaultAddress(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.usersService.setDefaultAddress(req.user.sub, id);
  }

  @Delete('addresses/:id')
  @ApiOperation({ summary: 'Delete address' })
  async deleteAddress(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    return this.usersService.deleteAddress(req.user.sub, id);
  }
}
