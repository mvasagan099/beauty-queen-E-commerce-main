import { Module, forwardRef } from '@nestjs/common';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { WebhookService } from './webhook.service';
import { RazorpayService } from './razorpay.service';
import { CartModule } from '../cart/cart.module';
import { OrdersModule } from '../orders/orders.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { PricingModule } from '../pricing/pricing.module';
import { CouponsModule } from '../coupons/coupons.module';
import { RateLimitGuard } from '../common/rate-limit.guard';

@Module({
  imports: [
    CartModule,
    forwardRef(() => OrdersModule),
    NotificationsModule,
    PricingModule,
    CouponsModule,
  ],
  controllers: [PaymentsController],
  providers: [PaymentsService, RazorpayService, WebhookService, RateLimitGuard],
  exports: [PaymentsService, RazorpayService],
})
export class PaymentsModule {}