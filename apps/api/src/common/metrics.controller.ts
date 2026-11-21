import { Controller, Get, Header, HttpCode, HttpStatus, Logger, UseGuards } from '@nestjs/common';
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

  @Get('prometheus')
  @HttpCode(HttpStatus.OK)
  @Header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8')
  @ApiOperation({ summary: 'Prometheus / OpenMetrics text exposition (admin)' })
  async prometheusMetrics(): Promise<string> {
    const snap = await this.metrics();
    const orders = (snap.orders as any) || {};
    const payments = (snap.payments as any) || {};
    const emailQ = (snap.queues.email as any) || {};
    const notifQ = (snap.queues.notifications as any) || {};

    const lines = [
      '# HELP bq_uptime_seconds Process uptime in seconds',
      '# TYPE bq_uptime_seconds gauge',
      `bq_uptime_seconds ${snap.uptime.toFixed(2)}`,
      '# HELP bq_memory_rss_bytes Resident set size in bytes',
      '# TYPE bq_memory_rss_bytes gauge',
      `bq_memory_rss_bytes ${snap.memory.rss}`,
      '# HELP bq_memory_heap_used_bytes V8 heap used in bytes',
      '# TYPE bq_memory_heap_used_bytes gauge',
      `bq_memory_heap_used_bytes ${snap.memory.heapUsed}`,
      '# HELP bq_orders_total Total orders count',
      '# TYPE bq_orders_total gauge',
      `bq_orders_total ${Number(orders.total || 0)}`,
      `bq_orders_paid_total ${Number(orders.paid || 0)}`,
      `bq_orders_cancelled_total ${Number(orders.cancelled || 0)}`,
      '# HELP bq_payments_total Payment outcomes count',
      '# TYPE bq_payments_total gauge',
      `bq_payments_total ${Number(payments.total || 0)}`,
      `bq_payments_captured_total ${Number(payments.successful || 0)}`,
      `bq_payments_failed_total ${Number(payments.failed || 0)}`,
      `bq_payments_refunded_total ${Number(payments.refunded || 0)}`,
      '# HELP bq_queue_jobs BullMQ queue job counts',
      '# TYPE bq_queue_jobs gauge',
      `bq_queue_jobs{queue="email",state="waiting"} ${Number(emailQ.waiting || 0)}`,
      `bq_queue_jobs{queue="email",state="failed"} ${Number(emailQ.failed || 0)}`,
      `bq_queue_jobs{queue="notifications",state="waiting"} ${Number(notifQ.waiting || 0)}`,
      `bq_queue_jobs{queue="notifications",state="failed"} ${Number(notifQ.failed || 0)}`,
    ];

    return lines.join('\n') + '\n';
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
