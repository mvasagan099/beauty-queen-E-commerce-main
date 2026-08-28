import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { ReturnsService } from './returns.service';
import { CreateReturnDto, UpdateReturnDto } from './dto/return.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('Returns')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('returns')
export class ReturnsController {
  constructor(private returnsService: ReturnsService) {}

  @Post()
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Request a return' })
  async createReturn(@Request() req: any, @Body() dto: CreateReturnDto) {
    const returnRequest = await this.returnsService.createReturnRequest(req.user.sub, dto);
    return { success: true, returnRequest };
  }

  @Get()
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Get my returns' })
  async getMyReturns(@Request() req: any) {
    const returns = await this.returnsService.getMyReturns(req.user.sub);
    return { success: true, returns };
  }

  @Get('admin')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Get all returns (admin)' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'search', required: false })
  async getAllReturns(
    @Query('status') status?: string,
    @Query('search') search?: string,
  ) {
    const returns = await this.returnsService.getAllReturns({ status, search });
    return { success: true, returns };
  }

  @Get(':id')
  @Roles(Role.CUSTOMER)
  @ApiOperation({ summary: 'Get return by id' })
  async getReturn(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    const returnRequest = await this.returnsService.getReturnById(id, req.user.sub);
    return { success: true, returnRequest };
  }

  @Patch('admin/:id')
  @Roles(Role.ADMIN)
  @ApiOperation({ summary: 'Update return status (admin)' })
  async updateReturn(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReturnDto,
  ) {
    const returnRequest = await this.returnsService.updateReturnStatus(id, dto, req.user.sub);
    return { success: true, returnRequest };
  }
}
