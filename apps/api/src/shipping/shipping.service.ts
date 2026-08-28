import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ShippingProvider,
  ShippingConfig,
  ConfigShippingProvider,
} from './shipping.provider';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  constructor(private prisma: PrismaService) {}

  private providerCache: Map<string, ShippingProvider> = new Map();

  /**
   * Resolve the active shipping provider. Currently always the config-based
   * provider; a real courier provider can be plugged in here.
   */
  private async getProvider(): Promise<ShippingProvider> {
    const config = await this.getConfig();
    const cacheKey = JSON.stringify(config || {});
    if (!this.providerCache.has(cacheKey)) {
      this.providerCache.clear();
      this.providerCache.set(cacheKey, new ConfigShippingProvider(config));
    }
    return this.providerCache.get(cacheKey)!;
  }

  async calculateShipping(subtotal: number, pincode?: string): Promise<number> {
    const provider = await this.getProvider();
    return provider.calculateCharge(subtotal, pincode);
  }

  async getConfig(): Promise<ShippingConfig | null> {
    const config = await this.prisma.siteConfig.findUnique({
      where: { key: 'shipping' },
    });
    return (config?.value as unknown as ShippingConfig) || null;
  }

  async updateConfig(config: ShippingConfig) {
    await this.prisma.siteConfig.upsert({
      where: { key: 'shipping' },
      update: { value: config as any },
      create: { key: 'shipping', value: config as any },
    });
    this.providerCache.clear();
    this.logger.log('Shipping config updated');
    return { success: true, config };
  }
}
