import { Controller, Get, Put, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { TaxService } from './tax.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('Tax')
@Controller('tax')
export class TaxController {
  constructor(private taxService: TaxService) {}

  @Get('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get tax config (admin)' })
  async getConfig() {
    const config = await this.taxService.getConfig();
    return { success: true, config };
  }

  @Put('config')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update tax config (admin)' })
  async updateConfig(@Body() body: any) {
    return this.taxService.updateConfig(body);
  }
}
