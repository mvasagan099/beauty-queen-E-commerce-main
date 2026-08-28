import { Controller, Get, Post, Put, Patch, Param, Body, UseGuards, Request, ParseIntPipe, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery } from '@nestjs/swagger';
import { SupportService } from './support.service';
import { CreateSupportTicketDto, ReplySupportTicketDto } from './dto/support.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

@ApiTags('Support')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.CUSTOMER)
@Controller('support')
export class SupportController {
  constructor(private supportService: SupportService) {}

  @Post('tickets')
  @ApiOperation({ summary: 'Create a support ticket' })
  async create(@Request() req: any, @Body() dto: CreateSupportTicketDto) {
    const ticket = await this.supportService.createTicket(
      { sub: req.user.sub, email: req.user.email, name: req.user.name },
      dto,
    );
    return { success: true, message: 'Support ticket created', ticket };
  }

  @Get('tickets')
  @ApiOperation({ summary: 'List my support tickets' })
  async list(@Request() req: any) {
    const tickets = await this.supportService.listMyTickets(req.user.sub);
    return { success: true, tickets };
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Get a support ticket with its conversation' })
  @ApiParam({ name: 'id', type: Number })
  async get(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    const ticket = await this.supportService.getTicket(
      { sub: req.user.sub, email: req.user.email, name: req.user.name },
      id,
    );
    return { success: true, ticket };
  }

  @Post('tickets/:id/messages')
  @ApiOperation({ summary: 'Reply to a support ticket' })
  @ApiParam({ name: 'id', type: Number })
  async reply(@Request() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: ReplySupportTicketDto) {
    const ticket = await this.supportService.replyAsCustomer(
      { sub: req.user.sub, email: req.user.email, name: req.user.name },
      id,
      dto.body,
    );
    return { success: true, message: 'Reply posted', ticket };
  }

  @Patch('tickets/:id/close')
  @ApiOperation({ summary: 'Close a support ticket' })
  @ApiParam({ name: 'id', type: Number })
  async close(@Request() req: any, @Param('id', ParseIntPipe) id: number) {
    const ticket = await this.supportService.closeTicket(
      { sub: req.user.sub, email: req.user.email, name: req.user.name },
      id,
    );
    return { success: true, message: 'Ticket closed', ticket };
  }
}