import { Module } from '@nestjs/common';
import { ScheduledJobsService } from './scheduled-jobs.service';
import { NotificationsModule } from '../notifications/notifications.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [NotificationsModule, AlertsModule],
  providers: [ScheduledJobsService],
})
export class ScheduledJobsModule {}