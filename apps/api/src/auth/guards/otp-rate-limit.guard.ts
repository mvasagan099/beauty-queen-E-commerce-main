import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RedisService } from '../../common/redis.service';

/**
 * OTP rate limiting.
 *
 * Keys on BOTH the account identifier (email from the request body) and the
 * source IP. Email-based limiting prevents attackers rotating IPs; IP-based
 * limiting prevents one host hammering many accounts. Protected endpoints also
 * carry a fixed email/verify attempt window so genuine users on shared
 * networks are not blocked.
 */

export const OTP_RATE_LIMIT_KEY = 'otpRateLimit';
export const OtpRateLimit = (action: string, max: number, windowSeconds: number) => {
  return (target: any, key?: string, descriptor?: any) => {
    const limit = { action, max, windowSeconds };
    if (descriptor) {
      Reflect.defineMetadata(OTP_RATE_LIMIT_KEY, limit, descriptor.value);
      return descriptor;
    }
    Reflect.defineMetadata(OTP_RATE_LIMIT_KEY, limit, target);
    return target;
  };
};

@Injectable()
export class OtpRateLimitGuard implements CanActivate {
  private readonly logger = new Logger(OtpRateLimitGuard.name);

  constructor(
    private reflector: Reflector,
    private redis: RedisService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const limit = this.reflector.getAllAndOverride<{
      action: string;
      max: number;
      windowSeconds: number;
    }>(OTP_RATE_LIMIT_KEY, [context.getHandler(), context.getClass()]);

    if (!limit) {
      return true;
    }

    const request: Request = context.switchToHttp().getRequest();
    const email = (request.body as any)?.email as string | undefined;
    const ip =
      request.headers?.['x-forwarded-for']?.toString().split(',')[0]?.trim() ||
      request.ip ||
      'unknown';

    // Per-email limit for the action (e.g. otp_send). Includes a per-email
    // hourly cap, independent of IP.
    if (email) {
      const emailKey = `ratelimit:otp:${limit.action}:email:${email.toLowerCase()}`;
      if ((await this.redis.incrWithTtl(emailKey, limit.windowSeconds)) > limit.max) {
        this.logger.warn(
          `OTP rate limit exceeded for ${limit.action} (email ${email}): IP ${ip}`,
        );
        throw new HttpException(
          { success: false, message: 'Too many OTP requests. Please try again later.' },
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }
    }

    // Per-IP limit for the action (covers anonymous abuse).
    const ipKey = `ratelimit:otp:${limit.action}:ip:${ip}`;
    if ((await this.redis.incrWithTtl(ipKey, limit.windowSeconds)) > limit.max) {
      this.logger.warn(
        `OTP rate limit exceeded for ${limit.action} (IP ${ip})`,
      );
      throw new HttpException(
        { success: false, message: 'Too many requests. Please try again later.' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }
}
