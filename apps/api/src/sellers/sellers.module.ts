import { Module } from '@nestjs/common';
import { SellersController } from './sellers.controller';
import { SellersService } from './sellers.service';
import { SellerOrdersController } from './seller-orders.controller';
import { AuthModule } from '../auth/auth.module';
import { OrdersModule } from '../orders/orders.module';
import { AuditModule } from '../audit/audit.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RateLimitGuard } from '../common/rate-limit.guard';

@Module({
  imports: [AuthModule, OrdersModule, AuditModule, NotificationsModule],
  controllers: [SellersController, SellerOrdersController],
  providers: [SellersService, RateLimitGuard],
})
export class SellersModule {}
