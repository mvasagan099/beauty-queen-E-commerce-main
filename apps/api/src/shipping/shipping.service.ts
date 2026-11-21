import { Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import {
  ShippingProvider,
  ShippingConfig,
  ConfigShippingProvider,
} from './shipping.provider';
import { ShiprocketShippingProvider } from './shiprocket.provider';

@Injectable()
export class ShippingService {
  private readonly logger = new Logger(ShippingService.name);

  constructor(private prisma: PrismaService) {}

  private providerCache: Map<string, ShippingProvider> = new Map();

  /**
   * Resolve the active shipping provider. Uses ShiprocketShippingProvider when
   * SHIPROCKET_EMAIL + SHIPROCKET_PASSWORD are set, automatically falling back
   * to ConfigShippingProvider otherwise.
   */
  private async getProvider(): Promise<ShippingProvider> {
    const config = await this.getConfig();
    const useShiprocket = Boolean(
      process.env.SHIPROCKET_EMAIL && process.env.SHIPROCKET_PASSWORD,
    );
    const cacheKey = `${useShiprocket ? 'sr' : 'cfg'}:${JSON.stringify(config || {})}`;
    if (!this.providerCache.has(cacheKey)) {
      this.providerCache.clear();
      this.providerCache.set(
        cacheKey,
        useShiprocket
          ? new ShiprocketShippingProvider(config)
          : new ConfigShippingProvider(config),
      );
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

  /**
   * Handle Shiprocket / courier tracking webhook to synchronize tracking
   * status and delivery timestamps on matching orders.
   */
  async handleCourierWebhook(
    payload: {
      awb?: string;
      courier_name?: string;
      current_status?: string;
      order_id?: string | number;
      tracking_url?: string;
    },
    apiKeyHeader?: string,
  ) {
    const expectedToken = process.env.SHIPROCKET_WEBHOOK_TOKEN;
    if (expectedToken && apiKeyHeader !== expectedToken) {
      throw new UnauthorizedException('Invalid courier webhook token');
    }

    const awb = payload.awb?.trim();
    const orderIdNum = payload.order_id != null ? Number(payload.order_id) : NaN;

    const order = Number.isInteger(orderIdNum) && orderIdNum > 0
      ? await this.prisma.order.findUnique({ where: { id: orderIdNum } })
      : awb
      ? await this.prisma.order.findFirst({ where: { trackingNumber: awb } })
      : null;

    if (!order) {
      this.logger.warn(`Courier webhook ignored: no matching order (awb=${awb || 'none'})`);
      return { success: true, updated: false };
    }

    const statusText = (payload.current_status || '').trim();
    const lower = statusText.toLowerCase();
    const updateData: Record<string, any> = {
      shippingStatus: statusText || order.shippingStatus,
      ...(awb ? { trackingNumber: awb } : {}),
      ...(payload.courier_name ? { carrier: payload.courier_name } : {}),
      ...(payload.tracking_url ? { trackingUrl: payload.tracking_url } : {}),
    };

    if (lower.includes('delivered')) {
      updateData.status = 'Delivered';
      updateData.deliveredAt = new Date();
    } else if (lower.includes('shipped') || lower.includes('in transit') || lower.includes('dispatched')) {
      if (order.status === 'Pending' || order.status === 'Confirmed' || order.status === 'Processing') {
        updateData.status = 'Shipped';
      }
      if (!order.shippedAt) {
        updateData.shippedAt = new Date();
      }
    }

    await this.prisma.order.update({
      where: { id: order.id },
      data: updateData,
    });

    this.logger.log(`Courier webhook updated order #${order.id}: status=${statusText}`);
    return { success: true, updated: true, orderId: order.id };
  }
}
