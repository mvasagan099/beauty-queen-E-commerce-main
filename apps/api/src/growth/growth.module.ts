import { Module } from '@nestjs/common';
import { GrowthController } from './growth.controller';
import { GrowthService } from './growth.service';
import { AbandonedCartService } from './abandoned-cart.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [PrismaModule, NotificationsModule],
  controllers: [GrowthController],
  providers: [GrowthService, AbandonedCartService],
  exports: [GrowthService, AbandonedCartService],
})
export class GrowthModule {}
