import { Module, forwardRef } from '@nestjs/common';
import { OrdersController } from './orders.controller';
import { OrdersService } from './orders.service';
import { OrderStatusService } from './order-status.service';
import { OrderQueryService } from './order-query.service';
import { ProductsModule } from '../products/products.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { AuditModule } from '../audit/audit.module';
import { RefundsModule } from '../refunds/refunds.module';
import { InvoicesModule } from '../invoices/invoices.module';

@Module({
  imports: [
    ProductsModule,
    NotificationsModule,
    AuditModule,
    InvoicesModule,
    forwardRef(() => RefundsModule),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrderStatusService, OrderQueryService],
  exports: [OrdersService, OrderStatusService, OrderQueryService],
})
export class OrdersModule {}
