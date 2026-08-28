import { Injectable, Logger } from '@nestjs/common';

/**
 * Abstraction over a shipping/courier integration.
 *
 * The shipping module only depends on this interface, so a real courier
 * provider (e.g. Shiprocket, Delhivery) can be added later without rewriting
 * any order or checkout logic. Currently only the config/rule-based provider
 * is implemented.
 */
export interface ShippingProvider {
  /**
   * Return the shipping charge for a subtotal and optionally a destination
   * pincode/delivery zone. A result of 0 means free shipping.
   */
  calculateCharge(subtotal: number, pincode?: string): Promise<number>;
}

export interface ShippingConfig {
  freeShippingThreshold: number;
  baseCharge: number;
  zoneOverrides?: Record<string, number>;
}

/**
 * Rule/config-backed shipping provider. Reads its settings from a raw config
 * object (persisted in SiteConfig by ShippingService).
 */
@Injectable()
export class ConfigShippingProvider implements ShippingProvider {
  private readonly logger = new Logger(ConfigShippingProvider.name);

  constructor(private readonly config: ShippingConfig | null) {}

  async calculateCharge(subtotal: number, pincode?: string): Promise<number> {
    if (!this.config) return 0;

    if (this.config.freeShippingThreshold && subtotal >= this.config.freeShippingThreshold) {
      this.logger.log(`Free shipping: subtotal ${subtotal} >= threshold ${this.config.freeShippingThreshold}`);
      return 0;
    }

    let charge = this.config.baseCharge || 0;

    if (pincode && this.config.zoneOverrides) {
      const zoneKey = pincode.substring(0, 3);
      if (this.config.zoneOverrides[zoneKey] !== undefined) {
        charge = this.config.zoneOverrides[zoneKey];
      }
    }

    return charge;
  }
}
