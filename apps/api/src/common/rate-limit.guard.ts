import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RedisService } from './redis.service';
import { PAYMENT_REDIS_KEYS } from '../payments/types/payment-status';

export const RATE_LIMIT_KEY = 'rateLimit';
export const RateLimit = (action: string, max: number, windowSeconds: number) => {
  return (target: any, key?: string, descriptor?: any) => {
    const limit = { action, max, windowSeconds };
    if (descriptor) {
      Reflect.defineMetadata(RATE_LIMIT_KEY, limit, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(RATE_LIMIT_KEY, limit, target);
    return target;
  };
};

/**
 * Sliding-window-ish rate limiter backed by Redis (with in-memory fallback).
 * Protected actions are limited per authenticated user; anonymous requests
 * are limited per source IP.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  constructor(
    private reflector: Reflector,
    private redisService: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const limit = this.reflector.getAllAndOverride<{
      action: string;
      max: number;
      windowSeconds: number;
    }>(RATE_LIMIT_KEY, [context.getHandler(), context.getClass()]);

    if (!limit) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const userId = request.user?.sub || null;
    const ip =
      request.headers?.['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
      request.ip ||
      'unknown';

    const key = userId
      ? PAYMENT_REDIS_KEYS.rateLimit(userId, limit.action)
      : `pay:rate:ip:${ip}:${limit.action}`;

    const count = await this.redisService.incrWithTtl(key, limit.windowSeconds);
    if (count > limit.max) {
      this.logger.warn(
        `Rate limit exceeded for ${limit.action} (${userId ? `user ${userId}` : `ip ${ip}`}): ${count}/${limit.max}`,
      );
      throw new HttpException(
        {
          success: false,
          message: 'Too many requests. Please try again later.',
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}