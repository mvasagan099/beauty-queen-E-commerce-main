import { Test, TestingModule } from '@nestjs/testing';
import { SupportService } from './support.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EmailEventType } from '../notifications/types/notification.types';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { TicketStatus } from '@prisma/client';

describe('SupportService', () => {
  let service: SupportService;
  let prisma: Record<string, any>;
  let notifications: Record<string, any>;

  const customer = { sub: 7, email: 'sheela@ex.com', name: 'Sheela' };
  const ticketRecord = {
    id: 3,
    ticketNumber: 'BQ-TKT-00003',
    userId: 7,
    orderId: null,
    subject: 'Refund question',
    status: 'OPEN',
    priority: 'MEDIUM',
    lastActivity: new Date(),
    resolvedAt: null,
    closedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    messages: [
      { id: 1, authorRole: 'CUSTOMER', body: 'Hi', createdAt: new Date() },
    ],
  };

  beforeEach(async () => {
    prisma = {
      supportTicket: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        count: jest.fn(),
      },
      supportMessage: { create: jest.fn() },
      order: { findUnique: jest.fn() },
      user: { findUnique: jest.fn() },
    };
    notifications = { notifySupportTicket: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SupportService,
        { provide: PrismaService, useValue: prisma },
        { provide: NotificationsService, useValue: notifications },
      ],
    }).compile();

    service = module.get<SupportService>(SupportService);
  });

  describe('createTicket', () => {
    it('should create a ticket with sequential number, first message and email', async () => {
      prisma.supportTicket.create.mockResolvedValue({ ...ticketRecord, id: 3 });
      prisma.supportTicket.update.mockResolvedValue(ticketRecord);
      prisma.supportTicket.findUnique.mockResolvedValue(ticketRecord);

      const result = await service.createTicket(customer, {
        subject: 'Refund question',
        body: 'Hi',
      });

      expect(prisma.supportTicket.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            ticketNumber: 'PENDING',
            userId: 7,
            status: TicketStatus.OPEN,
          }),
        }),
      );
      // second update call sets the id-based number
      const updateCalls = prisma.supportTicket.update.mock.calls;
      expect(updateCalls[0]).toEqual([
        { where: { id: 3 }, data: { ticketNumber: 'BQ-TKT-00003' } },
      ]);
      expect(prisma.supportMessage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          ticketId: 3,
          authorRole: 'CUSTOMER',
          isInternal: false,
        }),
      });
      expect(notifications.notifySupportTicket).toHaveBeenCalledWith(
        EmailEventType.SUPPORT_TICKET_CREATED,
        expect.objectContaining({ ticketNumber: 'BQ-TKT-00003' }),
      );
      expect(result.ticketNumber).toBe('BQ-TKT-00003');
    });

    it('should reject a ticket referencing an order you do not own', async () => {
      prisma.order.findUnique.mockResolvedValue({ id: 99, userId: 2, email: 'x@y.z' });

      await expect(
        service.createTicket(customer, { subject: 'S', body: 'B', orderId: 99 }),
      ).rejects.toThrow(BadRequestException);
      expect(prisma.supportTicket.create).not.toHaveBeenCalled();
    });
  });

  describe('getTicket', () => {
    it('should return a user-owned ticket excluding internal notes', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue(ticketRecord);

      const result = await service.getTicket(customer, 3);

      expect(prisma.supportTicket.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 3 },
          include: expect.objectContaining({
            messages: expect.objectContaining({ where: { isInternal: false } }),
          }),
        }),
      );
      expect(result.messages).toHaveLength(1);
    });

    it('should throw NotFound for another user ticket', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({ ...ticketRecord, userId: 99 });
      await expect(service.getTicket(customer, 3)).rejects.toThrow(NotFoundException);
    });
  });

  describe('replyAsCustomer', () => {
    it('should reject replies on a closed ticket', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({ ...ticketRecord, status: TicketStatus.CLOSED });
      await expect(service.replyAsCustomer(customer, 3, 'Hello?')).rejects.toThrow(BadRequestException);
    });

    it('should append a message and refresh lastActivity', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue(ticketRecord);
      prisma.supportTicket.update.mockResolvedValue(ticketRecord);
      prisma.supportTicket.findUnique.mockResolvedValue(ticketRecord);

      await service.replyAsCustomer(customer, 3, 'Hello?');

      expect(prisma.supportMessage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ ticketId: 3, authorRole: 'CUSTOMER', body: 'Hello?' }),
      });
      expect(prisma.supportTicket.update).toHaveBeenCalledWith({
        where: { id: 3 },
        data: expect.objectContaining({ lastActivity: expect.any(Date) }),
      });
    });
  });

  describe('adminList', () => {
    it('should paginate and search tickets', async () => {
      prisma.supportTicket.findMany.mockResolvedValue([
        { ...ticketRecord, user: { id: 7, name: 'Sheela', email: 'sheela@ex.com' }, messages: [] },
      ]);
      prisma.supportTicket.count.mockResolvedValue(1);

      const result = await service.adminList({ status: TicketStatus.OPEN, search: 'Refund', page: 1, limit: 20 });

      expect(prisma.supportTicket.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: TicketStatus.OPEN,
            OR: expect.arrayContaining([
              { subject: { contains: 'Refund' } },
            ]),
          }),
          skip: 0,
          take: 20,
        }),
      );
      expect(result.pagination).toEqual({ page: 1, limit: 20, total: 1, totalPages: 1 });
      expect(result.tickets[0].customer).toEqual({ id: 7, name: 'Sheela', email: 'sheela@ex.com' });
    });
  });

  describe('adminReply', () => {
    it('should set IN_PROGRESS for an OPEN ticket and notify the customer for public replies', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue({ ...ticketRecord, status: TicketStatus.OPEN });
      prisma.supportTicket.findUnique.mockResolvedValueOnce(ticketRecord);
      prisma.supportTicket.findUnique.mockResolvedValueOnce({
        ...ticketRecord,
        status: TicketStatus.IN_PROGRESS,
        user: { id: 7, name: 'Sheela', email: 'sheela@ex.com' },
        messages: [],
      });
      prisma.user.findUnique.mockResolvedValue({ id: 7, name: 'Sheela', email: 'sheela@ex.com' });

      await service.adminReply(1, 3, 'We are looking into it');

      expect(prisma.supportMessage.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ authorRole: 'ADMIN', isInternal: false }),
      });
      expect(prisma.supportTicket.update).toHaveBeenCalledWith({
        where: { id: 3 },
        data: expect.objectContaining({ status: TicketStatus.IN_PROGRESS }),
      });
      expect(notifications.notifySupportTicket).toHaveBeenCalledWith(
        EmailEventType.SUPPORT_TICKET_REPLIED,
        expect.objectContaining({ email: 'sheela@ex.com' }),
      );
    });

    it('should not email the customer for internal notes', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue(ticketRecord);

      await service.adminReply(1, 3, 'internal note', true);

      expect(notifications.notifySupportTicket).not.toHaveBeenCalled();
    });
  });

  describe('adminUpdateStatus', () => {
    it('should set resolvedAt and notify resolution when resolving', async () => {
      prisma.supportTicket.findUnique.mockResolvedValue(ticketRecord);
      prisma.supportTicket.findUnique.mockResolvedValueOnce(ticketRecord);
      prisma.supportTicket.findUnique.mockResolvedValueOnce({
        ...ticketRecord,
        status: TicketStatus.RESOLVED,
        user: { id: 7, email: 'sheela@ex.com' },
        messages: [],
      });
      prisma.user.findUnique.mockResolvedValue({ id: 7, name: 'Sheela', email: 'sheela@ex.com' });

      await service.adminUpdateStatus(1, 3, TicketStatus.RESOLVED);

      expect(prisma.supportTicket.update).toHaveBeenCalledWith({
        where: { id: 3 },
        data: expect.objectContaining({ status: TicketStatus.RESOLVED, resolvedAt: expect.any(Date) }),
      });
      expect(notifications.notifySupportTicket).toHaveBeenCalledWith(
        EmailEventType.SUPPORT_TICKET_RESOLVED,
        expect.objectContaining({ status: TicketStatus.RESOLVED }),
      );
    });
  });
});