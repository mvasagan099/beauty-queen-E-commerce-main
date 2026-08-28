import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as http from 'http';
import { AppModule } from './app.module';
import { RedisService } from './common/redis.service';

/**
 * Background worker entrypoint.
 *
 * Starts the NestJS application context (which wires BullMQ queue consumers)
 * plus a lightweight HTTP server exposing liveness/readiness probes so the
 * container orchestrator can monitor the worker independently of the API.
 *
 * Readiness verifies Redis connectivity because queue processing depends on
 * Redis. On SIGTERM/SIGINT the context is closed gracefully (drains in-flight
 * jobs) before the process exits.
 */
async function bootstrap() {
  const logger = new Logger('Worker');

  const app = await NestFactory.createApplicationContext(AppModule, {
    logger: ['error', 'warn', 'log'],
  });

  const configService = app.get(ConfigService);
  const redis = app.get(RedisService);
  const nodeEnv = configService.get<string>('NODE_ENV', 'development');
  const healthPort = configService.get<number>('WORKER_HEALTH_PORT', 5001);

  logger.log(`BullMQ Worker started [${nodeEnv}]`);

  const server = http.createServer(async (req, res) => {
    const url = req.url || '';
    res.setHeader('content-type', 'application/json');

    if (url === '/api/health/live' || url === '/health/live') {
      res.writeHead(200);
      res.end(JSON.stringify({ status: 'ok' }));
      return;
    }

    if (url === '/api/health/ready' || url === '/health/ready') {
      if (redis.isAvailable()) {
        res.writeHead(200);
        res.end(JSON.stringify({ status: 'ok' }));
      } else {
        res.writeHead(503);
        res.end(JSON.stringify({ status: 'not ready' }));
      }
      return;
    }

    res.writeHead(404);
    res.end(JSON.stringify({ status: 'not found' }));
  });

  server.listen(healthPort, () => {
    logger.log(`Worker health probes listening on port ${healthPort}`);
  });

  app.enableShutdownHooks();

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.log(`${signal} received, shutting down worker...`);
    server.close();
    await app.close();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

bootstrap();
