import { Controller, Get, HttpCode, HttpStatus, Logger, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from './redis.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '../auth/guards/roles.guard';
import { Role } from '@prisma/client';

/**
 * Observability metrics endpoint.
 *
 * Exposes operational and business metrics used by monitoring/alerting so that
 * queue depth, worker/job health, order/payment volume and runtime state can be
 * observed without an external metrics agent.
 *
 * Admin-authenticated only. If you need to scrape this from a monitoring agent
 * that cannot hold a JWT, restrict it at the reverse proxy (network allowlist)
 * instead of making it public.
 */
@ApiTags('Metrics')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('metrics')
export class MetricsController {
  private readonly logger = new Logger(MetricsController.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
    @InjectQueue('email') private emailQueue: Queue,
    @InjectQueue('notifications') private notificationQueue: Queue,
  ) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Operational and business metrics' })
  async metrics() {
    const [email, notifications, orders, payments, redisInfo] = await Promise.allSettled([
      this.queueCounts(this.emailQueue),
      this.queueCounts(this.notificationQueue),
      this.orderMetrics(),
      this.paymentMetrics(),
      this.redisSnapshot(),
    ]);

    return {
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: {
        rss: process.memoryUsage().rss,
        heapUsed: process.memoryUsage().heapUsed,
        heapTotal: process.memoryUsage().heapTotal,
        external: process.memoryUsage().external,
      },
      queues: {
        email: this.settleValue(email),
        notifications: this.settleValue(notifications),
      },
      orders: this.settleValue(orders),
      payments: this.settleValue(payments),
      redis: this.settleValue(redisInfo),
    };
  }

  @Get('queues')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'BullMQ queue depth metrics' })
  async queueMetrics() {
    const [email, notifications] = await Promise.allSettled([
      this.queueCounts(this.emailQueue),
      this.queueCounts(this.notificationQueue),
    ]);
    return {
      timestamp: new Date().toISOString(),
      queues: {
        email: this.settleValue(email),
        notifications: this.settleValue(notifications),
      },
    };
  }

  private async queueCounts(queue: Queue) {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);
    return { waiting, active, completed, failed, delayed };
  }

  private async orderMetrics() {
    const [total, paid, cancelled] = await Promise.all([
      this.prisma.order.count(),
      this.prisma.order.count({ where: { paymentStatus: 'Completed' } }),
      this.prisma.order.count({ where: { status: 'Cancelled' } }),
    ]);
    return { total, paid, cancelled };
  }

  private async paymentMetrics() {
    const successful = this.prisma.payment.count({
      where: { status: 'CAPTURED' },
    });
    const failed = this.prisma.payment.count({
      where: { status: 'FAILED' },
    });
    const total = this.prisma.payment.count();
    const refunds = this.prisma.refund.count().catch(() => 0);
    const [successCount, failedCount, totalCount, refundCount] = await Promise.all([
      successful,
      failed,
      total,
      refunds,
    ]);
    return {
      total: totalCount,
      successful: successCount,
      failed: failedCount,
      refunded: refundCount,
    };
  }

  private async redisSnapshot() {
    if (!this.redis.isAvailable()) {
      return { status: 'unavailable' };
    }
    return { status: 'connected' };
  }

  private settleValue(result: PromiseSettledResult<unknown>): unknown {
    return result.status === 'fulfilled' ? result.value : { error: 'unavailable' };
  }
}
