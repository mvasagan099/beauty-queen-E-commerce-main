import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { validateEnv } from './config/env.validation';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ProductsModule } from './products/products.module';
import { CategoriesModule } from './categories/categories.module';
import { CartModule } from './cart/cart.module';
import { CheckoutModule } from './checkout/checkout.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentsModule } from './payments/payments.module';
import { SellersModule } from './sellers/sellers.module';
import { AdminModule } from './admin/admin.module';
import { AnalyticsModule } from './admin/analytics/analytics.module';
import { ReviewsModule } from './reviews/reviews.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { CouponsModule } from './coupons/coupons.module';
import { InventoryModule } from './inventory/inventory.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AlertsModule } from './alerts/alerts.module';
import { SupportModule } from './support/support.module';
import { ScheduledJobsModule } from './scheduled/scheduled-jobs.module';
import { AuditModule } from './audit/audit.module';
import { PricingModule } from './pricing/pricing.module';
import { ShippingModule } from './shipping/shipping.module';
import { TaxModule } from './tax/tax.module';
import { ReturnsModule } from './returns/returns.module';
import { RefundsModule } from './refunds/refunds.module';
import { InvoicesModule } from './invoices/invoices.module';
import { HealthController } from './common/health.controller';
import { MetricsController } from './common/metrics.controller';
import { RedisModule } from './common/redis.module';
import { BullModule } from './common/bull.module';
import { CsrfModule } from './common/csrf/csrf.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '../../.env',
      validate: validateEnv,
    }),
    ScheduleModule.forRoot(),
    PrismaModule,
    BullModule,
    RedisModule,
    CsrfModule,
    AuthModule,
    UsersModule,
    ProductsModule,
    CategoriesModule,
    CartModule,
    CheckoutModule,
    OrdersModule,
    PaymentsModule,
    SellersModule,
    AdminModule,
    AnalyticsModule,
    ReviewsModule,
    WishlistModule,
    CouponsModule,
    InventoryModule,
    NotificationsModule,
    AlertsModule,
    SupportModule,
    ScheduledJobsModule,
    AuditModule,
    PricingModule,
    ShippingModule,
    TaxModule,
    ReturnsModule,
    RefundsModule,
    InvoicesModule,
  ],
  controllers: [HealthController, MetricsController],
})
export class AppModule {}
