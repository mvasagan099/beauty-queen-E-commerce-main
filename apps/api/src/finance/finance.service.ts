import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface PayoutRecord {
  id: string;
  sellerId: number;
  amount: number;
  utrReference: string;
  note: string | null;
  settledAt: string;
  settledBy: number | null;
}

export interface SellerLedgerSummary {
  sellerId: number;
  sellerName: string;
  sellerEmail: string;
  orderCount: number;
  grossSales: number;
  commissionRate: number;
  platformFee: number;
  netPayable: number;
  settledAmount: number;
  pendingBalance: number;
  payouts: PayoutRecord[];
}

export interface Gstr1HsnRow {
  hsn: string;
  category: string;
  gstRate: number;
  quantity: number;
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  totalValue: number;
}

const HSN_BY_CATEGORY: Record<string, { hsn: string; defaultRate: number }> = {
  saree: { hsn: '5007', defaultRate: 5 },
  kurthi: { hsn: '6204', defaultRate: 5 },
  top: { hsn: '6206', defaultRate: 5 },
  leggin: { hsn: '6104', defaultRate: 5 },
  cosmetics: { hsn: '3304', defaultRate: 18 },
};

const INTRA_STATE_HINTS = [
  'chennai',
  'coimbatore',
  'madurai',
  'trichy',
  'tiruchirappalli',
  'salem',
  'vellore',
  'erode',
  'tirunelveli',
  'tamil nadu',
  'tn',
];

@Injectable()
export class FinanceService {
  private readonly logger = new Logger(FinanceService.name);

  constructor(private readonly prisma: PrismaService) {}

  getCommissionRate(): number {
    const raw = Number(process.env.PLATFORM_COMMISSION_RATE || '0.10');
    if (!Number.isFinite(raw) || raw < 0 || raw > 0.5) return 0.1;
    return raw;
  }

  private payoutConfigKey(sellerId: number): string {
    return `payouts:seller:${sellerId}`;
  }

  private async getSellerPayoutHistory(sellerId: number): Promise<PayoutRecord[]> {
    const cfg = await this.prisma.siteConfig
      .findUnique({ where: { key: this.payoutConfigKey(sellerId) } })
      .catch(() => null);
    return Array.isArray(cfg?.value) ? (cfg.value as unknown as PayoutRecord[]) : [];
  }

  async getSellerLedger(sellerId: number): Promise<SellerLedgerSummary> {
    const commissionRate = this.getCommissionRate();
    const [seller, orders, payouts] = await Promise.all([
      this.prisma.seller.findUnique({
        where: { id: sellerId },
        select: { id: true, sellername: true, email: true },
      }),
      this.prisma.order.findMany({
        where: {
          sellerId,
          status: { notIn: ['Cancelled', 'Refunded'] },
        },
        select: { id: true, subtotal: true, price: true, quantity: true },
      }),
      this.getSellerPayoutHistory(sellerId),
    ]);

    const grossSales = orders.reduce(
      (sum, o) => sum + (Number(o.subtotal) || Number(o.price || 0) * (o.quantity || 1)),
      0,
    );
    const platformFee = Math.round(grossSales * commissionRate);
    const netPayable = Math.max(0, grossSales - platformFee);
    const settledAmount = payouts.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const pendingBalance = Math.max(0, netPayable - settledAmount);

    return {
      sellerId,
      sellerName: seller?.sellername || `Seller #${sellerId}`,
      sellerEmail: seller?.email || '',
      orderCount: orders.length,
      grossSales,
      commissionRate,
      platformFee,
      netPayable,
      settledAmount,
      pendingBalance,
      payouts,
    };
  }

  async getAllSellerLedgers() {
    const sellers = await this.prisma.seller.findMany({
      select: { id: true },
      orderBy: { id: 'asc' },
    });

    const ledgers = await Promise.all(sellers.map((s) => this.getSellerLedger(s.id)));
    const totals = ledgers.reduce(
      (acc, l) => ({
        grossSales: acc.grossSales + l.grossSales,
        platformFee: acc.platformFee + l.platformFee,
        netPayable: acc.netPayable + l.netPayable,
        settledAmount: acc.settledAmount + l.settledAmount,
        pendingBalance: acc.pendingBalance + l.pendingBalance,
      }),
      { grossSales: 0, platformFee: 0, netPayable: 0, settledAmount: 0, pendingBalance: 0 },
    );

    return {
      commissionRate: this.getCommissionRate(),
      totals,
      sellers: ledgers,
    };
  }

  async recordPayout(input: {
    sellerId: number;
    amount: number;
    utrReference: string;
    note?: string;
    adminUserId?: number;
  }): Promise<PayoutRecord> {
    const amount = Math.round(Number(input.amount));
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new BadRequestException('Payout amount must be a positive number');
    }
    const utrReference = (input.utrReference || '').trim().toUpperCase().slice(0, 64);
    if (utrReference.length < 4) {
      throw new BadRequestException('Valid bank UTR / transfer reference is required');
    }

    const existing = await this.getSellerPayoutHistory(input.sellerId);
    const record: PayoutRecord = {
      id: `PAY-${Date.now()}`,
      sellerId: input.sellerId,
      amount,
      utrReference,
      note: input.note ? input.note.trim().slice(0, 200) : null,
      settledAt: new Date().toISOString(),
      settledBy: input.adminUserId ?? null,
    };

    const updated = [record, ...existing].slice(0, 200);
    await this.prisma.siteConfig.upsert({
      where: { key: this.payoutConfigKey(input.sellerId) },
      update: { value: updated as any },
      create: { key: this.payoutConfigKey(input.sellerId), value: updated as any },
    });

    this.logger.log(
      `Recorded payout ₹${amount} to seller #${input.sellerId} (UTR: ${utrReference})`,
    );
    return record;
  }

  // ─── Indian GST GSTR-1 Monthly Report ──────────────────────────

  private resolveHsnAndRate(category: string, unitPrice: number): { hsn: string; gstRate: number } {
    const key = (category || '').toLowerCase();
    const match = HSN_BY_CATEGORY[key];
    if (key.includes('cosmetic')) {
      return { hsn: '3304', gstRate: 18 };
    }
    const hsn = match?.hsn || '6211';
    // Indian textile GST slab: 5% up to ₹1,000, 12% above ₹1,000
    const gstRate = unitPrice > 1000 ? 12 : 5;
    return { hsn, gstRate };
  }

  private isIntraState(district?: string | null, pincode?: string | null): boolean {
    if (pincode && /^6[0-4]/.test(pincode.trim())) return true;
    const d = (district || '').toLowerCase();
    return INTRA_STATE_HINTS.some((hint) => d.includes(hint));
  }

  async generateGstr1Report(month?: string) {
    const now = new Date();
    const resolvedMonth =
      month && /^\d{4}-\d{2}$/.test(month)
        ? month
        : `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

    const [yearStr, monthStr] = resolvedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const mon = parseInt(monthStr, 10) - 1;
    const start = new Date(Date.UTC(year, mon, 1, 0, 0, 0));
    const end = new Date(Date.UTC(year, mon + 1, 1, 0, 0, 0));

    const orders = await this.prisma.order.findMany({
      where: {
        status: { notIn: ['Cancelled', 'Refunded'] },
        orderDate: { gte: start, lt: end },
      },
      include: { product: { select: { ptype: true } } },
      orderBy: { orderDate: 'asc' },
    });

    const hsnMap = new Map<string, Gstr1HsnRow>();
    let totalTaxableValue = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalInvoiceValue = 0;

    for (const order of orders) {
      const qty = Number(order.quantity || 1);
      const unitPrice = Number(order.price || 0);
      const grossValue = Number(order.subtotal) || unitPrice * qty;
      const category = order.product?.ptype || 'apparel';
      const { hsn, gstRate } = this.resolveHsnAndRate(category, unitPrice);

      const taxableValue = Math.round((grossValue / (1 + gstRate / 100)) * 100) / 100;
      const taxAmount = Math.round((grossValue - taxableValue) * 100) / 100;
      const intra = this.isIntraState(order.district, order.pincode);
      const cgst = intra ? Math.round((taxAmount / 2) * 100) / 100 : 0;
      const sgst = intra ? Math.round((taxAmount - cgst) * 100) / 100 : 0;
      const igst = intra ? 0 : taxAmount;

      totalTaxableValue += taxableValue;
      totalCgst += cgst;
      totalSgst += sgst;
      totalIgst += igst;
      totalInvoiceValue += grossValue;

      const mapKey = `${hsn}:${gstRate}`;
      const existing = hsnMap.get(mapKey);
      if (!existing) {
        hsnMap.set(mapKey, {
          hsn,
          category,
          gstRate,
          quantity: qty,
          taxableValue,
          cgst,
          sgst,
          igst,
          totalValue: grossValue,
        });
      } else {
        existing.quantity += qty;
        existing.taxableValue = Math.round((existing.taxableValue + taxableValue) * 100) / 100;
        existing.cgst = Math.round((existing.cgst + cgst) * 100) / 100;
        existing.sgst = Math.round((existing.sgst + sgst) * 100) / 100;
        existing.igst = Math.round((existing.igst + igst) * 100) / 100;
        existing.totalValue = Math.round((existing.totalValue + grossValue) * 100) / 100;
      }
    }

    const hsnSummary = Array.from(hsnMap.values()).sort((a, b) =>
      a.hsn.localeCompare(b.hsn),
    );

    return {
      month: resolvedMonth,
      gstin: process.env.STORE_GSTIN || '33AAACB0000A1Z5',
      legalName: process.env.STORE_LEGAL_NAME || 'Beauty Queen Fashion & Cosmetics',
      invoiceCount: orders.length,
      totals: {
        taxableValue: Math.round(totalTaxableValue * 100) / 100,
        cgst: Math.round(totalCgst * 100) / 100,
        sgst: Math.round(totalSgst * 100) / 100,
        igst: Math.round(totalIgst * 100) / 100,
        totalTax: Math.round((totalCgst + totalSgst + totalIgst) * 100) / 100,
        totalValue: Math.round(totalInvoiceValue * 100) / 100,
      },
      hsnSummary,
    };
  }

  private sanitizeCsvCell(value: unknown): string {
    let text = String(value ?? '');
    // Prevent spreadsheet formula injection (Excel / Google Sheets / LibreOffice Calc)
    if (/^[=+\-@\t\r]/.test(text)) {
      text = `'${text}`;
    }
    if (/[",\r\n]/.test(text)) {
      return `"${text.replace(/"/g, '""')}"`;
    }
    return text;
  }

  formatGstr1Csv(report: Awaited<ReturnType<FinanceService['generateGstr1Report']>>): string {
    const header =
      'Month,HSN,Category,GST Rate (%),Total Quantity,Taxable Value (INR),CGST (INR),SGST (INR),IGST (INR),Total Invoice Value (INR)';
    const rows = report.hsnSummary.map((r) =>
      [
        report.month,
        r.hsn,
        r.category,
        r.gstRate,
        r.quantity,
        r.taxableValue.toFixed(2),
        r.cgst.toFixed(2),
        r.sgst.toFixed(2),
        r.igst.toFixed(2),
        r.totalValue.toFixed(2),
      ]
        .map((cell) => this.sanitizeCsvCell(cell))
        .join(','),
    );
    return [header, ...rows].join('\n');
  }
}
