import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../common/redis.service';
import { resolveProductSize } from '../common/product-size.util';

export interface StockReservationItem {
  productId: number;
  size: string;
  quantity: number;
}

export interface StockReservationRecord {
  checkoutId: string;
  items: StockReservationItem[];
  expiresAt: number;
}

const DEFAULT_RESERVATION_TTL_SECONDS = 600; // 10 minutes
const ACTIVE_INDEX_KEY = 'stock:reservations:active';

@Injectable()
export class StockReservationService {
  private readonly logger = new Logger(StockReservationService.name);

  constructor(private readonly redis: RedisService) {}

  private reservationKey(checkoutId: string): string {
    return `stock:reservation:${checkoutId}`;
  }

  async reserve(
    checkoutId: string,
    items: StockReservationItem[],
    ttlSeconds = DEFAULT_RESERVATION_TTL_SECONDS,
  ): Promise<StockReservationRecord> {
    const normalizedItems = items.map((item) => ({
      productId: item.productId,
      size: resolveProductSize(item.size).canonicalSize,
      quantity: Math.max(1, Math.floor(item.quantity)),
    }));

    const record: StockReservationRecord = {
      checkoutId,
      items: normalizedItems,
      expiresAt: Date.now() + ttlSeconds * 1000,
    };

    await this.redis.set(
      this.reservationKey(checkoutId),
      JSON.stringify(record),
      ttlSeconds,
    );

    const activeIds = await this.getActiveIds();
    if (!activeIds.includes(checkoutId)) {
      activeIds.push(checkoutId);
      await this.redis.set(ACTIVE_INDEX_KEY, JSON.stringify(activeIds), ttlSeconds * 2);
    }

    this.logger.log(
      `Reserved stock for checkout ${checkoutId} (${normalizedItems.length} line(s), TTL=${ttlSeconds}s)`,
    );
    return record;
  }

  async getReservation(checkoutId: string): Promise<StockReservationRecord | null> {
    const raw = await this.redis.get(this.reservationKey(checkoutId));
    if (!raw) return null;
    try {
      const parsed = JSON.parse(raw) as StockReservationRecord;
      if (parsed.expiresAt && parsed.expiresAt <= Date.now()) {
        await this.release(checkoutId);
        return null;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  async release(checkoutId: string): Promise<void> {
    await this.redis.del(this.reservationKey(checkoutId));
    const activeIds = await this.getActiveIds();
    const filtered = activeIds.filter((id) => id !== checkoutId);
    await this.redis.set(ACTIVE_INDEX_KEY, JSON.stringify(filtered), DEFAULT_RESERVATION_TTL_SECONDS * 2);
    this.logger.log(`Released stock reservation for checkout ${checkoutId}`);
  }

  async getReservedQuantity(productId: number, size: string): Promise<number> {
    const canonical = resolveProductSize(size).canonicalSize;
    const activeIds = await this.getActiveIds();
    if (activeIds.length === 0) return 0;

    let totalReserved = 0;
    const liveIds: string[] = [];

    for (const checkoutId of activeIds) {
      const rec = await this.getReservation(checkoutId);
      if (!rec) continue;
      liveIds.push(checkoutId);
      for (const item of rec.items) {
        if (item.productId === productId && item.size === canonical) {
          totalReserved += item.quantity;
        }
      }
    }

    if (liveIds.length !== activeIds.length) {
      await this.redis.set(ACTIVE_INDEX_KEY, JSON.stringify(liveIds), DEFAULT_RESERVATION_TTL_SECONDS * 2);
    }

    return totalReserved;
  }

  private async getActiveIds(): Promise<string[]> {
    const raw = await this.redis.get(ACTIVE_INDEX_KEY);
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}
