import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { InAppNotificationService } from '../email/in-app-notification.service';
import { InAppNotificationPayload } from '../types/notification.types';

@Processor('notifications')
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(private inAppNotificationService: InAppNotificationService) {
    super();
  }

  async process(job: Job<InAppNotificationPayload>): Promise<any> {
    const { userId, type, title } = job.data;
    this.logger.log(`Processing in-app notification job ${job.id}: type=${type}, userId=${userId}`);

    try {
      await this.inAppNotificationService.create(job.data);
      this.logger.log(`In-app notification created for user ${userId}: ${title}`);
      return { success: true, userId, type };
    } catch (error) {
      this.logger.error(`In-app notification job ${job.id} failed: ${error.message}`);
      throw error;
    }
  }
}
