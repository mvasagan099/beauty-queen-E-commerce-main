import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  private client: any = null;
  private memoryStore = new Map<string, { value: string; expiresAt?: number }>();
  private usingMemory = false;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('REDIS_HOST', 'localhost');
    const port = this.configService.get<number>('REDIS_PORT', 6379);
    const password = this.configService.get<string>('REDIS_PASSWORD') || undefined;
    const tls = this.configService.get<boolean>('REDIS_TLS') === true;
    const redisUrl =
      this.configService.get<string>('REDIS_URL') || undefined;

    try {
      // Dynamic import so it doesn't crash if ioredis isn't installed or Redis is down
      const Redis = require('ioredis');
      this.client = redisUrl
        ? new Redis(redisUrl, {
            password,
            maxRetriesPerRequest: null,
            enableOfflineQueue: false,
            connectTimeout: 3000,
            retryStrategy: (times: number) => Math.min(times * 200, 5000),
          })
        : new Redis({
            host,
            port,
            password,
            ...(tls ? { tls: {} } : {}),
            maxRetriesPerRequest: null,
            enableOfflineQueue: false,
            connectTimeout: 3000,
            retryStrategy: (times: number) => Math.min(times * 200, 5000),
          });

      this.client.on('connect', () => {
        this.logger.log('Redis connected');
        this.usingMemory = false;
      });

      this.client.on('error', (err: Error) => {
        if (!this.usingMemory) {
          this.logger.warn(`Redis unavailable, using in-memory fallback: ${err.message}`);
          this.usingMemory = true;
        }
      });

      this.client.on('close', () => {
        if (!this.usingMemory) {
          this.logger.warn('Redis connection closed, using in-memory fallback');
          this.usingMemory = true;
        }
      });
    } catch {
      this.logger.warn('ioredis not available, using in-memory fallback');
      this.usingMemory = true;
    }

    // Mark as memory fallback after 2 seconds if Redis hasn't connected
    setTimeout(() => {
      if (!this.usingMemory && this.client?.status !== 'ready') {
        this.logger.warn('Redis connection timeout, using in-memory fallback');
        this.usingMemory = true;
      }
    }, 2000);
  }

  async onModuleDestroy() {
    if (this.client) {
      // disconnect() (not quit()) so shutdown never blocks on an
      // un-established Redis connection (e.g. when falling back to memory).
      this.client.disconnect();
    }
  }

  async get(key: string): Promise<string | null> {
    if (this.usingMemory || !this.client) {
      return this.memoryGet(key);
    }
    try {
      return await this.client.get(key);
    } catch (error) {
      this.fallbackToMemory(error);
      return this.memoryGet(key);
    }
  }

  async set(key: string, value: string, ttl?: number): Promise<void> {
    if (this.usingMemory || !this.client) {
      this.memorySet(key, value, ttl);
      return;
    }
    try {
      if (ttl) {
        await this.client.set(key, value, 'EX', ttl);
      } else {
        await this.client.set(key, value);
      }
    } catch (error) {
      this.fallbackToMemory(error);
      this.memorySet(key, value, ttl);
    }
  }

  async del(key: string): Promise<void> {
    if (this.usingMemory || !this.client) {
      this.memoryStore.delete(key);
      return;
    }
    try {
      await this.client.del(key);
    } catch (error) {
      this.fallbackToMemory(error);
      this.memoryStore.delete(key);
    }
  }

  async incr(key: string): Promise<number> {
    if (this.usingMemory || !this.client) {
      return this.memoryIncr(key);
    }
    try {
      return await this.client.incr(key);
    } catch (error) {
      this.fallbackToMemory(error);
      return this.memoryIncr(key);
    }
  }

  async expire(key: string, ttl: number): Promise<void> {
    if (this.usingMemory || !this.client) {
      const entry = this.memoryStore.get(key);
      if (entry) {
        entry.expiresAt = Date.now() + ttl * 1000;
      }
      return;
    }
    try {
      await this.client.expire(key, ttl);
    } catch (error) {
      this.fallbackToMemory(error);
      const entry = this.memoryStore.get(key);
      if (entry) {
        entry.expiresAt = Date.now() + ttl * 1000;
      }
    }
  }

  async incrWithTtl(key: string, ttl: number): Promise<number> {
    if (this.usingMemory || !this.client) {
      const val = await this.memoryIncr(key);
      if (val === 1) {
        const entry = this.memoryStore.get(key);
        if (entry) {
          entry.expiresAt = Date.now() + ttl * 1000;
        }
      }
      return val;
    }
    try {
      const val = await this.client.incr(key);
      if (val === 1) {
        await this.client.expire(key, ttl);
      }
      return val;
    } catch (error) {
      this.fallbackToMemory(error);
      const val = await this.memoryIncr(key);
      if (val === 1) {
        const entry = this.memoryStore.get(key);
        if (entry) {
          entry.expiresAt = Date.now() + ttl * 1000;
        }
      }
      return val;
    }
  }

  /**
   * Set a key only if it does not already exist.
   * Returns true when the lock/key was acquired, false when it was already present.
   * Used for distributed locks; Redis is never the source of truth.
   */
  async setNx(key: string, value: string, ttl?: number): Promise<boolean> {
    if (this.usingMemory || !this.client) {
      return this.memorySetNx(key, value, ttl);
    }
    try {
      const result = await this.client.set(key, value, 'EX', ttl ?? 60, 'NX');
      return result !== null;
    } catch (error) {
      this.fallbackToMemory(error);
      return this.memorySetNx(key, value, ttl);
    }
  }

  isAvailable(): boolean {
    return !this.usingMemory && this.client?.status === 'ready';
  }

  /**
   * Runs `fn` only if a distributed lock can be acquired, releasing it when
   * done. Returns null when another worker already holds the lock (or Redis /
   * the lock store is unavailable). Both the API and the worker boot AppModule
   * and register the same schedulers, so every scheduled job must run inside a
   * lock to stay idempotent across processes.
   */
  async withLock<T>(key: string, ttlSeconds: number, fn: () => Promise<T>): Promise<T | null> {
    const lockKey = `lock:${key}`;
    const acquired = await this.setNx(lockKey, Date.now().toString(), ttlSeconds);
    if (!acquired) {
      return null;
    }
    try {
      return await fn();
    } finally {
      await this.del(lockKey);
    }
  }

  private fallbackToMemory(error: Error): void {
    this.logger.warn(`Redis command failed, using in-memory fallback: ${error.message}`);
    this.usingMemory = true;
  }

  private memoryGet(key: string): string | null {
    const entry = this.memoryStore.get(key);
    if (!entry) return null;
    if (entry.expiresAt && Date.now() > entry.expiresAt) {
      this.memoryStore.delete(key);
      return null;
    }
    return entry.value;
  }

  private memorySet(key: string, value: string, ttl?: number): void {
    this.memoryStore.set(key, {
      value,
      expiresAt: ttl ? Date.now() + ttl * 1000 : undefined,
    });
  }

  private memoryIncr(key: string): number {
    const entry = this.memoryStore.get(key);
    const val = (entry ? parseInt(entry.value) : 0) + 1;
    this.memoryStore.set(key, { value: val.toString(), expiresAt: entry?.expiresAt });
    return val;
  }

  private memorySetNx(key: string, value: string, ttl?: number): boolean {
    if (this.memoryStore.has(key)) return false;
    this.memoryStore.set(key, {
      value,
      expiresAt: ttl ? Date.now() + ttl * 1000 : undefined,
    });
    return true;
  }
}
