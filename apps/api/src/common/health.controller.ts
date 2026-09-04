import { Controller, Get, HttpCode, HttpStatus, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../common/redis.service';

@ApiTags('Health')
@Controller('health')
export class HealthController {
  private readonly logger = new Logger(HealthController.name);

  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Full health check' })
  async check() {
    const checks = await Promise.allSettled([
      this.checkDatabase(),
      this.checkRedis(),
    ]);

    const dbResult = checks[0] as PromiseFulfilledResult<HealthStatus>;
    const redisResult = checks[1] as PromiseFulfilledResult<HealthStatus>;

    const db = dbResult.status === 'fulfilled' ? dbResult.value : { status: 'unreachable' as const, latency: 0 };
    const redis = redisResult.status === 'fulfilled' ? redisResult.value : { status: 'unreachable' as const, latency: 0 };

    const isHealthy = db.status === 'connected' && redis.status === 'connected';

    return {
      status: isHealthy ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: db,
        redis,
      },
    };
  }

  @Get('live')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Liveness probe - is the process alive?' })
  live() {
    return { status: 'ok' };
  }

  @Get('ready')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Readiness probe - can the service handle traffic?' })
  async ready() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok' };
    } catch {
      return { status: 'not ready' };
    }
  }

  private async checkDatabase(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'connected', latency: Date.now() - start };
    } catch (error) {
      this.logger.error('Database health check failed', error);
      return { status: 'disconnected', latency: Date.now() - start };
    }
  }

  private async checkRedis(): Promise<HealthStatus> {
    const start = Date.now();
    try {
      if (this.redis.isAvailable()) {
        await this.redis.set('_health_check', '1', 10);
        await this.redis.del('_health_check');
        return { status: 'connected', latency: Date.now() - start };
      }
      return { status: 'unavailable', latency: Date.now() - start };
    } catch (error) {
      this.logger.warn('Redis health check failed', error);
      return { status: 'disconnected', latency: Date.now() - start };
    }
  }
}

interface HealthStatus {
  status: 'connected' | 'disconnected' | 'unavailable' | 'unreachable';
  latency: number;
}
