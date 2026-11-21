import { Logger } from '@nestjs/common';
import { ShippingProvider, ConfigShippingProvider, ShippingConfig } from './shipping.provider';

export interface ShiprocketConfig {
  email?: string;
  password?: string;
  pickupPincode?: string;
  baseUrl?: string;
}

export interface CourierRateEstimate {
  serviceable: boolean;
  charge: number;
  courierName: string;
  estimatedDays: string;
  codAvailable: boolean;
}

/**
 * Real Indian courier integration adapter for Shiprocket REST API v1.
 * Automatically falls back to ConfigShippingProvider if credentials are unset
 * or if the Shiprocket API is unreachable.
 */
export class ShiprocketShippingProvider implements ShippingProvider {
  private readonly logger = new Logger(ShiprocketShippingProvider.name);
  private readonly fallback: ConfigShippingProvider;
  private readonly email?: string;
  private readonly password?: string;
  private readonly pickupPincode: string;
  private readonly baseUrl: string;

  private cachedToken: { token: string; expiresAt: number } | null = null;

  constructor(
    fallbackConfig: ShippingConfig | null,
    shiprocketConfig?: ShiprocketConfig,
  ) {
    this.fallback = new ConfigShippingProvider(fallbackConfig);
    this.email = shiprocketConfig?.email ?? process.env.SHIPROCKET_EMAIL;
    this.password = shiprocketConfig?.password ?? process.env.SHIPROCKET_PASSWORD;
    this.pickupPincode =
      shiprocketConfig?.pickupPincode ?? process.env.SHIPROCKET_PICKUP_PINCODE ?? '600001';
    this.baseUrl = (
      shiprocketConfig?.baseUrl ??
      process.env.SHIPROCKET_API_URL ??
      'https://apiv2.shiprocket.in/v1/external'
    ).replace(/\/+$/, '');
  }

  isConfigured(): boolean {
    return Boolean(this.email && this.password);
  }

  async calculateCharge(subtotal: number, pincode?: string): Promise<number> {
    // Respect free-shipping threshold from store config first
    const configCharge = await this.fallback.calculateCharge(subtotal, pincode);
    if (configCharge === 0 && subtotal > 0) {
      return 0;
    }

    if (!this.isConfigured() || !pincode || !/^[1-9]\d{5}$/.test(pincode)) {
      return configCharge;
    }

    try {
      const estimate = await this.checkServiceability(pincode, 0.5, true);
      if (estimate.serviceable) {
        return Math.round(estimate.charge);
      }
      return configCharge;
    } catch (err: any) {
      this.logger.warn(`Shiprocket rate check fell back to config rules: ${err?.message}`);
      return configCharge;
    }
  }

  async checkServiceability(
    deliveryPincode: string,
    weightKg = 0.5,
    cod = true,
  ): Promise<CourierRateEstimate> {
    if (!this.isConfigured()) {
      const prefix = Number(deliveryPincode.substring(0, 2));
      const estimatedDays =
        prefix >= 60 && prefix <= 64
          ? '2–3 business days'
          : prefix >= 50 && prefix <= 69
          ? '3–4 business days'
          : '4–6 business days';
      return {
        serviceable: /^[1-9]\d{5}$/.test(deliveryPincode),
        charge: 60,
        courierName: 'Beauty Queen Standard Courier',
        estimatedDays,
        codAvailable: true,
      };
    }

    const token = await this.getAuthToken();
    const qs = new URLSearchParams({
      pickup_postcode: this.pickupPincode,
      delivery_postcode: deliveryPincode,
      weight: String(weightKg),
      cod: cod ? '1' : '0',
    });

    const res = await fetch(`${this.baseUrl}/courier/serviceability/?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error(`Shiprocket serviceability HTTP ${res.status}`);
    }

    const data = (await res.json()) as any;
    const couriers: any[] = data?.data?.available_courier_companies || [];
    if (couriers.length === 0) {
      return {
        serviceable: false,
        charge: 0,
        courierName: 'Unavailable',
        estimatedDays: 'Not serviceable',
        codAvailable: false,
      };
    }

    // Pick lowest-rate serviceable courier
    const best = [...couriers].sort((a, b) => Number(a.rate || 9999) - Number(b.rate || 9999))[0];
    return {
      serviceable: true,
      charge: Number(best.rate || 0),
      courierName: String(best.courier_name || 'Shiprocket Partner'),
      estimatedDays: best.etd ? `Est. ${best.etd}` : `${best.estimated_delivery_days || '3–5'} business days`,
      codAvailable: Boolean(best.cod),
    };
  }

  private async getAuthToken(): Promise<string> {
    if (this.cachedToken && this.cachedToken.expiresAt > Date.now()) {
      return this.cachedToken.token;
    }

    const res = await fetch(`${this.baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: this.email, password: this.password }),
    });
    if (!res.ok) {
      throw new Error(`Shiprocket auth failed with HTTP ${res.status}`);
    }
    const body = (await res.json()) as { token?: string };
    if (!body.token) {
      throw new Error('Shiprocket auth response missing token');
    }

    // Shiprocket tokens remain valid for 10 days; cache safely for 8 days
    this.cachedToken = {
      token: body.token,
      expiresAt: Date.now() + 8 * 24 * 60 * 60 * 1000,
    };
    return body.token;
  }
}
