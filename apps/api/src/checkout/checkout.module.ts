import { Module } from '@nestjs/common';
import { CheckoutController } from './checkout.controller';
import { CheckoutService } from './checkout.service';
import { CartModule } from '../cart/cart.module';
import { ProductsModule } from '../products/products.module';
import { PricingModule } from '../pricing/pricing.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { RateLimitGuard } from '../common/rate-limit.guard';

@Module({
  imports: [CartModule, ProductsModule, PricingModule, NotificationsModule],
  controllers: [CheckoutController],
  providers: [CheckoutService, RateLimitGuard],
})
export class CheckoutModule {}
