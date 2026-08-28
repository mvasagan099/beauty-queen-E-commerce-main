import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InAppNotificationPayload } from '../types/notification.types';

@Injectable()
export class InAppNotificationService {
  private readonly logger = new Logger(InAppNotificationService.name);

  constructor(private prisma: PrismaService) {}

  async create(payload: InAppNotificationPayload): Promise<void> {
    try {
      await (this.prisma as any).notification.create({
        data: {
          userId: payload.userId,
          type: payload.type,
          title: payload.title,
          message: payload.message,
          data: payload.data ?? null,
        },
      });
      this.logger.log(`In-app notification created for user ${payload.userId}: ${payload.title}`);
    } catch (error) {
      this.logger.error(`Failed to create in-app notification: ${error.message}`);
    }
  }

  async getNotifications(userId: number, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [notifications, total] = await Promise.all([
      (this.prisma as any).notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
      }),
      (this.prisma as any).notification.count({ where: { userId } }),
    ]);

    return {
      notifications,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async getUnreadCount(userId: number): Promise<number> {
    return (this.prisma as any).notification.count({
      where: { userId, readAt: null },
    });
  }

  async markAsRead(userId: number, notificationId: number): Promise<void> {
    const notification = await (this.prisma as any).notification.findFirst({
      where: { id: notificationId, userId },
    });

    if (!notification) {
      return;
    }

    await (this.prisma as any).notification.update({
      where: { id: notificationId },
      data: { readAt: new Date() },
    });
  }

  async markAllAsRead(userId: number): Promise<void> {
    await (this.prisma as any).notification.updateMany({
      where: { userId, readAt: null },
      data: { readAt: new Date() },
    });
  }
}
