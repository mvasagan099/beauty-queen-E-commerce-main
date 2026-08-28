import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Observable } from 'rxjs';

interface RateLimitEntry {
  count: number;
  resetAt: number;
}

@Injectable()
export class RateLimitInterceptor implements NestInterceptor {
  private readonly store = new Map<string, RateLimitEntry>();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(options: { windowMs: number; maxRequests: number }) {
    this.windowMs = options.windowMs;
    this.maxRequests = options.maxRequests;

    setInterval(() => this.cleanup(), this.windowMs);
  }

  private cleanup() {
    const now = Date.now();
    for (const [key, entry] of this.store) {
      if (entry.resetAt <= now) {
        this.store.delete(key);
      }
    }
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest();
    const ip = request.ip || request.connection?.remoteAddress || 'unknown';
    const path = request.route?.path || request.url;
    const key = `${ip}:${path}`;
    const now = Date.now();

    const entry = this.store.get(key);

    if (!entry || entry.resetAt <= now) {
      this.store.set(key, { count: 1, resetAt: now + this.windowMs });
      return next.handle();
    }

    if (entry.count >= this.maxRequests) {
      throw new HttpException(
        'Too many requests. Please try again later.',
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    entry.count++;
    return next.handle();
  }
}

@Injectable()
export class SearchRateLimitInterceptor extends RateLimitInterceptor {
  constructor() {
    super({ windowMs: 60 * 1000, maxRequests: 30 });
  }
}

@Injectable()
export class AuthRateLimitInterceptor extends RateLimitInterceptor {
  constructor() {
    super({ windowMs: 60 * 1000, maxRequests: 10 });
  }
}

@Injectable()
export class CheckoutRateLimitInterceptor extends RateLimitInterceptor {
  constructor() {
    super({ windowMs: 60 * 1000, maxRequests: 5 });
  }
}
