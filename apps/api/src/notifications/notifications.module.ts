import { Module } from '@nestjs/common';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { EmailService } from './email/email.service';
import { EmailProcessor } from './email/email.processor';
import { InAppNotificationService } from './email/in-app-notification.service';
import { NotificationProcessor } from './jobs/notification.processor';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [
    PrismaModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    EmailService,
    EmailProcessor,
    InAppNotificationService,
    NotificationProcessor,
  ],
  exports: [NotificationsService, InAppNotificationService],
})
export class NotificationsModule {}
