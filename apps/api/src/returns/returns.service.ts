import { Injectable, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReturnDto, UpdateReturnDto } from './dto/return.dto';
import { NotificationsService } from '../notifications/notifications.service';
import { AuditService } from '../audit/audit.service';
import { AuditAction } from '../audit/types/audit.types';

@Injectable()
export class ReturnsService {
  private readonly logger = new Logger(ReturnsService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private auditService: AuditService,
  ) {}

  async createReturnRequest(userId: number, dto: CreateReturnDto) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
    });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.userId !== userId) {
      throw new BadRequestException('Not authorized');
    }

    const nonReturnableStatuses = ['Cancelled', 'Refunded'];
    if (nonReturnableStatuses.includes(order.status)) {
      throw new BadRequestException(`Cannot return order with status: ${order.status}`);
    }

    if (order.status !== 'Delivered') {
      throw new BadRequestException('Returns can only be requested for delivered orders');
    }

    const existingReturn = await this.prisma.returnRequest.findFirst({
      where: {
        orderId: dto.orderId,
        userId,
        status: { notIn: ['REJECTED', 'CANCELLED'] },
      },
    });
    if (existingReturn) {
      throw new BadRequestException('A return request already exists for this order');
    }

    const returnRequest = await this.prisma.returnRequest.create({
      data: {
        orderId: dto.orderId,
        userId,
        reason: dto.reason,
        note: dto.note || null,
        status: 'REQUESTED',
      },
      include: { order: { include: { product: true } } },
    });

    // Record an order audit event (support/debugging timeline).
    await this.prisma.orderEvent.create({
      data: {
        orderId: dto.orderId,
        type: 'RETURN_REQUESTED',
        message: `Return requested: ${dto.reason}`,
        actor: 'CUSTOMER',
        meta: { returnRequestId: returnRequest.id } as any,
      },
    });

    if (returnRequest.order?.email) {
      await this.notificationsService.notifyReturnRequested({
        id: returnRequest.order.id,
        email: returnRequest.order.email,
        username: returnRequest.order.username || 'Customer',
        productName: returnRequest.order.name || 'Product',
        reason: dto.reason,
      });
    }

    this.logger.log(`Return request created for order ${dto.orderId} by user ${userId}`);
    return returnRequest;
  }

  async getMyReturns(userId: number) {
    return this.prisma.returnRequest.findMany({
      where: { userId },
      include: { order: { include: { product: true } }, refunds: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getReturnById(id: number, userId?: number) {
    const where: any = { id };
    if (userId) where.userId = userId;

    const returnRequest = await this.prisma.returnRequest.findFirst({
      where,
      include: { order: { include: { product: true } }, refunds: true },
    });
    if (!returnRequest) {
      throw new NotFoundException('Return request not found');
    }
    return returnRequest;
  }

  /** Admin view of a return without customer-ownership restriction. */
  async getByIdForAdmin(id: number) {
    const returnRequest = await this.prisma.returnRequest.findFirst({
      where: { id },
      include: {
        order: {
          include: {
            product: true,
            seller: { select: { id: true, sellername: true, email: true } },
          },
        },
        user: { select: { id: true, name: true, email: true } },
        refunds: true,
      },
    });
    if (!returnRequest) {
      throw new NotFoundException('Return request not found');
    }
    return returnRequest;
  }

  async getAllReturns(filters?: { status?: string; search?: string }) {
    const where: any = {};
    if (filters?.status) {
      where.status = filters.status;
    }
    if (filters?.search) {
      where.OR = [
        { order: { username: { contains: filters.search } } },
        { order: { email: { contains: filters.search } } },
      ];
    }

    return this.prisma.returnRequest.findMany({
      where,
      include: {
        order: { include: { product: true } },
        user: { select: { id: true, name: true, email: true } },
        refunds: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateReturnStatus(id: number, dto: UpdateReturnDto, adminId?: number) {
    const returnRequest = await this.prisma.returnRequest.findUnique({
      where: { id },
    });
    if (!returnRequest) {
      throw new NotFoundException('Return request not found');
    }

    const validTransitions: Record<string, string[]> = {
      REQUESTED: ['APPROVED', 'REJECTED'],
      APPROVED: ['PICKUP_PENDING', 'COMPLETED', 'CANCELLED'],
      PICKUP_PENDING: ['RECEIVED', 'CANCELLED'],
      RECEIVED: ['COMPLETED'],
      COMPLETED: [],
      REJECTED: [],
      CANCELLED: [],
    };

    const allowed = validTransitions[returnRequest.status];
    if (allowed && !allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Cannot transition from ${returnRequest.status} to ${dto.status}. Allowed: ${allowed.join(', ') || 'none'}`,
      );
    }

    const updateData: any = { status: dto.status };
    if (dto.note) updateData.note = dto.note;
    if (dto.status === 'APPROVED') updateData.approvedAt = new Date();
    if (dto.status === 'COMPLETED') updateData.completedAt = new Date();

    const updated = await this.prisma.returnRequest.update({
      where: { id },
      data: updateData,
      include: { order: { include: { product: true } }, refunds: true },
    });

    if (updated.order?.email) {
      const emailData = {
        id: updated.order.id,
        email: updated.order.email,
        username: updated.order.username || 'Customer',
        productName: updated.order.name || 'Product',
      };

      switch (dto.status) {
        case 'APPROVED':
          await this.notificationsService.notifyReturnApproved(emailData);
          break;
        case 'REJECTED':
          await this.notificationsService.notifyReturnRejected({
            ...emailData,
            reason: dto.note || undefined,
          });
          break;
      }
    }

    // Record an order audit event for the return transition.
    await this.prisma.orderEvent.create({
      data: {
        orderId: updated.orderId,
        type: `RETURN_${dto.status}`,
        message: `Return status changed to ${dto.status}`,
        actor: 'ADMIN',
        meta: { returnRequestId: id, note: dto.note || null } as any,
      },
    });

    await this.auditService.log({
      action: dto.status === 'APPROVED' ? AuditAction.RETURN_APPROVED : AuditAction.RETURN_REJECTED,
      entityType: 'ReturnRequest',
      entityId: id,
      actorId: adminId,
      actorRole: 'ADMIN',
      details: { oldStatus: returnRequest.status, newStatus: dto.status },
    });

    this.logger.log(`Return ${id} status updated to ${dto.status}`);
    return updated;
  }
}
