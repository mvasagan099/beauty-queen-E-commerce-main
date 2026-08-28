import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TaxConfig {
  gstRate: number;
  gstType: string;
  inclusive: boolean;
}

@Injectable()
export class TaxService {
  private readonly logger = new Logger(TaxService.name);

  constructor(private prisma: PrismaService) {}

  async calculateTax(amount: number, pincode?: string): Promise<number> {
    const config = await this.getConfig();
    if (!config || !config.gstRate) return 0;

    if (config.inclusive) {
      return 0;
    }

    return Math.round((amount * config.gstRate) / 100);
  }

  async getConfig(): Promise<TaxConfig | null> {
    const config = await this.prisma.siteConfig.findUnique({
      where: { key: 'tax' },
    });
    return (config?.value as unknown as TaxConfig) || null;
  }

  async updateConfig(config: TaxConfig) {
    await this.prisma.siteConfig.upsert({
      where: { key: 'tax' },
      update: { value: config as any },
      create: { key: 'tax', value: config as any },
    });
    this.logger.log('Tax config updated');
    return { success: true, config };
  }
}
