import { Injectable } from '@nestjs/common';

export interface InvoiceNumberConfig {
  prefix: string;
  year: number;
  // zero-padded width of the running number, e.g. 6 for "000001"
  padding: number;
}

// Minimal shape of the (transaction) client required for invoice numbering.
type InvoiceTxClient = {
  invoice: { count(args?: any): Promise<number> };
};

/**
 * Builds the human-readable invoice number from its sequential part.
 * Format example (configurable): BQ-2026-000001
 */
@Injectable()
export class InvoiceNumberService {
  private readonly DEFAULT_PREFIX = 'BQ';
  private readonly DEFAULT_PADDING = 6;

  format(seq: number, config?: Partial<InvoiceNumberConfig>): string {
    const prefix = config?.prefix ?? this.DEFAULT_PREFIX;
    const year = config?.year ?? new Date().getFullYear();
    const padding = config?.padding ?? this.DEFAULT_PADDING;
    return `${prefix}-${year}-${String(seq).padStart(padding, '0')}`;
  }

  /**
   * Produce the next sequential number by counting existing invoices, so
   * numbers are never reused. Count-based to keep it safe within a
   * transaction (ids may have gaps after deletions, count does not).
   */
  async nextInvoiceNumber(
    tx: InvoiceTxClient,
    config?: Partial<InvoiceNumberConfig>,
  ): Promise<string> {
    const count = await tx.invoice.count();
    return this.format(count + 1, config);
  }
}

