import { Module, Global } from '@nestjs/common';
import { BullModule as NestBullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
  imports: [
    NestBullModule.forRootAsync({
      useFactory: (configService: ConfigService) => {
        const password =
          configService.get<string>('REDIS_PASSWORD') || undefined;
        const tls = configService.get<boolean>('REDIS_TLS') === true;
        const redisUrl = configService.get<string>('REDIS_URL') || undefined;
        return {
          connection: redisUrl
            ? {
                url: redisUrl,
                password,
                enableOfflineQueue: false,
                maxRetriesPerRequest: null,
                retryStrategy: (times: number) => Math.min(times * 200, 5000),
              }
            : {
                host: configService.get<string>('REDIS_HOST', 'localhost'),
                port: configService.get<number>('REDIS_PORT', 6379),
                password,
                ...(tls ? { tls: {} } : {}),
                enableOfflineQueue: false,
                maxRetriesPerRequest: null,
                retryStrategy: (times: number) => Math.min(times * 200, 5000),
              },
          defaultJobOptions: {
            removeOnComplete: 50,
            removeOnFail: 20,
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          },
        };
      },
      inject: [ConfigService],
    }),
    NestBullModule.registerQueue({ name: 'email' }, { name: 'notifications' }),
  ],
  exports: [NestBullModule],
})
export class BullModule {}
