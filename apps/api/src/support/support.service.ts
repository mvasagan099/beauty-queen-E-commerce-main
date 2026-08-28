import { Injectable, NotFoundException, BadRequestException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailEventType } from '../notifications/types/notification.types';
import { TicketStatus, TicketPriority } from '@prisma/client';

export interface CustomerContext {
  sub: number;
  email: string;
  name?: string;
}

/**
 * Customer support tickets.
 *
 * A ticket carries a human-friendly sequential number (BQ-TKT-00001 style),
 * an optional associated order, a status/priority, and a message thread.
 * Admin replies may be marked internal; internal notes are never returned to
 * customers. Email updates go through the shared BullMQ queue with a
 * deterministic eventId (idempotent across retries).
 */
@Injectable()
export class SupportService {
  private readonly logger = new Logger(SupportService.name);

  constructor(
    private prisma: PrismaService,
    private notifications: NotificationsService,
  ) {}

  private formatTicketNumber(id: number): string {
    return `BQ-TKT-${String(id).padStart(5, '0')}`;
  }

  private async validateOwnedOrder(userId: number, email: string, orderId?: number) {
    if (orderId == null) return;
    const order = await this.prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new BadRequestException('The referenced order does not exist');
    }
    const ownsById = order.userId != null && order.userId === userId;
    const ownsByEmail = order.email != null && order.email.toLowerCase() === email.toLowerCase();
    if (!ownsById && !ownsByEmail) {
      throw new BadRequestException('The referenced order does not belong to you');
    }
  }

  async createTicket(user: CustomerContext, dto: { subject: string; body: string; orderId?: number }) {
    await this.validateOwnedOrder(user.sub, user.email, dto.orderId);

    const ticket = await this.prisma.supportTicket.create({
      data: {
        ticketNumber: 'PENDING', // replaced below with the sequential id-based number
        userId: user.sub,
        orderId: dto.orderId ?? null,
        subject: dto.subject,
        status: TicketStatus.OPEN,
        priority: TicketPriority.MEDIUM,
        lastActivity: new Date(),
      },
    });

    const ticketNumber = this.formatTicketNumber(ticket.id);
    await this.prisma.supportTicket.update({
      where: { id: ticket.id },
      data: { ticketNumber },
    });

    await this.prisma.supportMessage.create({
      data: {
        ticketId: ticket.id,
        authorRole: 'CUSTOMER',
        authorId: user.sub,
        body: dto.body,
        isInternal: false,
      },
    });

    await this.notifications.notifySupportTicket(EmailEventType.SUPPORT_TICKET_CREATED, {
      userId: user.sub,
      email: user.email,
      username: user.name || 'there',
      ticketId: ticket.id,
      ticketNumber,
      subject: dto.subject,
      status: 'OPEN',
      message: dto.body,
    });

    this.logger.log(`Support ticket ${ticketNumber} created by user ${user.sub}`);
    return this.getTicket(user, ticket.id);
  }

  async listMyTickets(userId: number) {
    const tickets = await this.prisma.supportTicket.findMany({
      where: { userId },
      include: {
        messages: {
          select: { id: true, authorRole: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return tickets.map((t) => ({
      id: t.id,
      ticketNumber: t.ticketNumber,
      subject: t.subject,
      orderId: t.orderId,
      status: t.status,
      priority: t.priority,
      lastActivity: t.lastActivity,
      lastMessage: t.messages[0]
        ? { id: t.messages[0].id, authorRole: t.messages[0].authorRole, createdAt: t.messages[0].createdAt }
        : null,
      createdAt: t.createdAt,
      updatedAt: t.updatedAt,
    }));
  }

  /** Customer view of a ticket: internal admin notes are always excluded. */
  async getTicket(user: CustomerContext, ticketId: number) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        messages: {
          where: { isInternal: false },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!ticket || ticket.userId !== user.sub) {
      throw new NotFoundException('Ticket not found');
    }

    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      orderId: ticket.orderId,
      status: ticket.status,
      priority: ticket.priority,
      lastActivity: ticket.lastActivity,
      resolvedAt: ticket.resolvedAt,
      closedAt: ticket.closedAt,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      messages: ticket.messages.map((m) => ({
        id: m.id,
        authorRole: m.authorRole,
        body: m.body,
        createdAt: m.createdAt,
      })),
    };
  }

  async replyAsCustomer(user: CustomerContext, ticketId: number, body: string) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.userId !== user.sub) {
      throw new NotFoundException('Ticket not found');
    }
    if (ticket.status === TicketStatus.CLOSED) {
      throw new BadRequestException('This ticket is closed. Please open a new ticket.');
    }

    await this.prisma.supportMessage.create({
      data: { ticketId, authorRole: 'CUSTOMER', authorId: user.sub, body, isInternal: false },
    });
    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: { lastActivity: new Date() },
    });

    this.logger.log(`Customer ${user.sub} replied on ticket ${ticketId}`);
    return this.getTicket(user, ticketId);
  }

  async closeTicket(user: CustomerContext, ticketId: number) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket || ticket.userId !== user.sub) {
      throw new NotFoundException('Ticket not found');
    }
    if (ticket.status === TicketStatus.CLOSED) {
      return this.getTicket(user, ticketId);
    }

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: TicketStatus.CLOSED,
        closedAt: new Date(),
        lastActivity: new Date(),
      },
    });

    if (ticket.status !== TicketStatus.RESOLVED) {
      await this.notifications.notifySupportTicket(EmailEventType.SUPPORT_TICKET_CLOSED, {
        userId: user.sub,
        email: user.email,
        username: user.name || 'there',
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        subject: ticket.subject,
        status: 'CLOSED',
      });
    }

    this.logger.log(`Ticket ${ticket.id} closed by customer ${user.sub}`);
    return this.getTicket(user, ticketId);
  }

  // ---------------------------------------------------------------------------
  // Admin operations
  // ---------------------------------------------------------------------------

  async adminList(query: { status?: TicketStatus; priority?: TicketPriority; search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, query.page || 1);
    const limit = Math.min(100, Math.max(1, query.limit || 20));
    const where: any = {};

    if (query.status) where.status = query.status;
    if (query.priority) where.priority = query.priority;
    if (query.search && query.search.trim()) {
      const term = query.search.trim();
      where.OR = [
        { ticketNumber: { contains: term } },
        { subject: { contains: term } },
      ];
    }

    const [tickets, total] = await Promise.all([
      this.prisma.supportTicket.findMany({
        where,
        include: {
          user: { select: { id: true, email: true, name: true } },
          messages: { select: { id: true, authorRole: true, createdAt: true }, orderBy: { createdAt: 'desc' }, take: 1 },
        },
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.supportTicket.count({ where }),
    ]);

    return {
      tickets: tickets.map((t) => ({
        id: t.id,
        ticketNumber: t.ticketNumber,
        subject: t.subject,
        orderId: t.orderId,
        customer: t.user ? { id: t.user.id, name: t.user.name, email: t.user.email } : null,
        status: t.status,
        priority: t.priority,
        lastActivity: t.lastActivity,
        lastMessage: t.messages[0] ? { id: t.messages[0].id, authorRole: t.messages[0].authorRole, createdAt: t.messages[0].createdAt } : null,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  /** Admin view of a ticket: internal notes ARE included. */
  async adminGet(ticketId: number) {
    const ticket = await this.prisma.supportTicket.findUnique({
      where: { id: ticketId },
      include: {
        user: { select: { id: true, email: true, name: true } },
        messages: { orderBy: { createdAt: 'asc' } },
        order: { select: { id: true, name: true, status: true, totalAmount: true } },
      },
    });

    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      subject: ticket.subject,
      orderId: ticket.orderId,
      order: ticket.order,
      customer: ticket.user ? { id: ticket.user.id, name: ticket.user.name, email: ticket.user.email } : null,
      status: ticket.status,
      priority: ticket.priority,
      lastActivity: ticket.lastActivity,
      resolvedAt: ticket.resolvedAt,
      closedAt: ticket.closedAt,
      createdAt: ticket.createdAt,
      updatedAt: ticket.updatedAt,
      messages: ticket.messages.map((m) => ({
        id: m.id,
        authorRole: m.authorRole,
        authorId: m.authorId,
        body: m.body,
        isInternal: m.isInternal,
        createdAt: m.createdAt,
      })),
    };
  }

  async adminReply(actorId: number, ticketId: number, body: string, isInternal = false) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    await this.prisma.supportMessage.create({
      data: { ticketId, authorRole: 'ADMIN', authorId: actorId, body, isInternal },
    });

    await this.prisma.supportTicket.update({
      where: { id: ticketId },
      data: {
        status: ticket.status === TicketStatus.OPEN ? TicketStatus.IN_PROGRESS : ticket.status,
        lastActivity: new Date(),
      },
    });

    if (!isInternal) {
      const customer = await this.prisma.user.findUnique({ where: { id: ticket.userId } });
      if (customer) {
        await this.notifications.notifySupportTicket(EmailEventType.SUPPORT_TICKET_REPLIED, {
          userId: customer.id,
          email: customer.email,
          username: customer.name || 'there',
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          status: 'IN_PROGRESS',
          message: body,
        });
      }
    }

    this.logger.log(`Admin ${actorId} replied on ticket ${ticketId} (internal=${isInternal})`);
    return this.adminGet(ticketId);
  }

  async adminUpdateStatus(actorId: number, ticketId: number, status: TicketStatus) {
    const ticket = await this.prisma.supportTicket.findUnique({ where: { id: ticketId } });
    if (!ticket) {
      throw new NotFoundException('Ticket not found');
    }

    const now = new Date();
    const data: any = { status, lastActivity: now };
    if (status === TicketStatus.RESOLVED) {
      data.resolvedAt = now;
      data.closedAt = null;
    }
    if (status === TicketStatus.CLOSED) {
      data.closedAt = now;
    }
    if (status === TicketStatus.OPEN) {
      data.resolvedAt = null;
      data.closedAt = null;
    }

    await this.prisma.supportTicket.update({ where: { id: ticketId }, data });

    const customer = await this.prisma.user.findUnique({ where: { id: ticket.userId } });
    if (customer && (status === TicketStatus.RESOLVED || status === TicketStatus.CLOSED)) {
      await this.notifications.notifySupportTicket(
        status === TicketStatus.RESOLVED
          ? EmailEventType.SUPPORT_TICKET_RESOLVED
          : EmailEventType.SUPPORT_TICKET_CLOSED,
        {
          userId: customer.id,
          email: customer.email,
          username: customer.name || 'there',
          ticketId: ticket.id,
          ticketNumber: ticket.ticketNumber,
          subject: ticket.subject,
          status,
        },
      );
    }

    this.logger.log(`Admin ${actorId} set ticket ${ticketId} to ${status}`);
    return this.adminGet(ticketId);
  }
}