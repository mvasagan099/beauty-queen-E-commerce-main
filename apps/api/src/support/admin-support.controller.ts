import {
  Controller, Get, Post, Patch, Param, Query, Body, UseGuards, Request, ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { AdminReplySupportTicketDto, UpdateTicketStatusDto } from './dto/support.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role, TicketStatus, TicketPriority } from '@prisma/client';

@ApiTags('Admin Support')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/support')
export class AdminSupportController {
  constructor(private supportService: SupportService) {}

  @Get('tickets')
  @ApiOperation({ summary: 'List support tickets (admin)' })
  @ApiQuery({ name: 'status', required: false, enum: TicketStatus })
  @ApiQuery({ name: 'priority', required: false, enum: TicketPriority })
  @ApiQuery({ name: 'search', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async list(
    @Query('status') status?: TicketStatus,
    @Query('priority') priority?: TicketPriority,
    @Query('search') search?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const result = await this.supportService.adminList({
      status,
      priority,
      search,
      page: page ? parseInt(page, 10) : undefined,
      limit: limit ? parseInt(limit, 10) : undefined,
    });
    return { success: true, ...result };
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get a support ticket with internal notes (admin)' })
  @ApiParam({ name: 'id', type: Number })
  async get(@Param('id', ParseIntPipe) id: number) {
    const ticket = await this.supportService.adminGet(id);
    return { success: true, ticket };
  }

  @Post('tickets/:id/messages')
  @ApiOperation({ summary: 'Reply to a support ticket; isInternal notes stay hidden from the customer' })
  @ApiParam({ name: 'id', type: Number })
  async reply(
    @Request() req: any,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AdminReplySupportTicketDto,
  ) {
    const ticket = await this.supportService.adminReply(req.user.sub, id, dto.body, dto.isInternal ?? false);
    return { success: true, message: 'Reply posted', ticket };
  }

  @Patch('tickets/:id/status')
  @ApiOperation({ summary: 'Update ticket status (open/in_progress/resolved/closed)' })
  @ApiParam({ name: 'id', type: Number })
  async updateStatus(@Request() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateTicketStatusDto) {
    const ticket = await this.supportService.adminUpdateStatus(req.user.sub, id, dto.status);
    return { success: true, message: 'Ticket status updated', ticket };
  }
}