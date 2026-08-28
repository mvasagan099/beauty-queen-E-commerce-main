import { Controller, Get, Patch, Param, Body, Query, UseGuards, Request, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { ReturnsService } from '../returns/returns.service';
import { UpdateReturnDto } from '../returns/dto/return.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('Admin Returns')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/returns')
export class AdminReturnsController {
  constructor(private returnsService: ReturnsService) {}

  @Get()
  @ApiOperation({ summary: 'Get all returns (admin)' })
  async getAll(
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const returns = await this.returnsService.getAllReturns({ status, search });
    return { success: true, returns };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get return by id (admin)' })
  async getOne(@Param('id', ParseIntPipe) id: number) {
    const returnRequest = await this.returnsService.getByIdForAdmin(id);
    return { success: true, returnRequest };
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Update return status (admin)' })
  async updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReturnDto,
    @Request() req: any,
  ) {
    const returnRequest = await this.returnsService.updateReturnStatus(id, dto, req.user.sub);
    return { success: true, returnRequest };
  }
}
