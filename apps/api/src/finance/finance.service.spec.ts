import { BadRequestException } from '@nestjs/common';
import { FinanceService } from './finance.service';

describe('FinanceService', () => {
  let service: FinanceService;
  let prisma: any;
  let configStore: Map<string, any>;

  beforeEach(() => {
    configStore = new Map();
    prisma = {
      seller: {
        findUnique: jest.fn().mockResolvedValue({
          id: 3,
          sellername: 'Kanchipuram Looms',
          email: 'looms@example.com',
        }),
        findMany: jest.fn().mockResolvedValue([{ id: 3 }]),
      },
      order: {
        findMany: jest.fn(),
      },
      siteConfig: {
        findUnique: jest.fn(async ({ where }: any) =>
          configStore.has(where.key) ? { key: where.key, value: configStore.get(where.key) } : null,
        ),
        upsert: jest.fn(async ({ where, create, update }: any) => {
          const val = configStore.has(where.key) ? update.value : create.value;
          configStore.set(where.key, val);
          return { key: where.key, value: val };
        }),
      },
    };
    service = new FinanceService(prisma);
  });

  it('computes seller gross sales, 10% platform commission, net payable, and UTR payouts', async () => {
    prisma.order.findMany.mockResolvedValue([
      { id: 1, subtotal: 5000, price: 5000, quantity: 1 },
      { id: 2, subtotal: 3000, price: 1500, quantity: 2 },
    ]);

    const before = await service.getSellerLedger(3);
    expect(before.grossSales).toBe(8000);
    expect(before.platformFee).toBe(800);
    expect(before.netPayable).toBe(7200);
    expect(before.pendingBalance).toBe(7200);

    await expect(
      service.recordPayout({ sellerId: 3, amount: 0, utrReference: 'UTR123456' }),
    ).rejects.toThrow(BadRequestException);

    const payout = await service.recordPayout({
      sellerId: 3,
      amount: 4000,
      utrReference: 'utr20261122001',
      note: 'Weekly settlement',
      adminUserId: 1,
    });
    expect(payout.utrReference).toBe('UTR20261122001');

    const after = await service.getSellerLedger(3);
    expect(after.settledAmount).toBe(4000);
    expect(after.pendingBalance).toBe(3200);
    expect(after.payouts).toHaveLength(1);
  });

  it('generates Indian GST GSTR-1 HSN summary with CGST/SGST vs IGST split and CSV output', async () => {
    prisma.order.findMany.mockResolvedValue([
      // Intra-state Tamil Nadu saree > ₹1,000 => 12% GST (6% CGST + 6% SGST)
      {
        id: 10,
        price: 2240,
        quantity: 1,
        subtotal: 2240,
        district: 'Chennai',
        pincode: '600001',
        product: { ptype: 'saree' },
      },
      // Inter-state Maharashtra cosmetics => 18% IGST
      {
        id: 11,
        price: 1180,
        quantity: 1,
        subtotal: 1180,
        district: 'Mumbai',
        pincode: '400001',
        product: { ptype: 'cosmetics' },
      },
    ]);

    const report = await service.generateGstr1Report('2026-11');
    expect(report.invoiceCount).toBe(2);
    expect(report.hsnSummary).toHaveLength(2);
    expect(report.totals.taxableValue).toBeCloseTo(3000, 1);
    expect(report.totals.cgst).toBeCloseTo(120, 1);
    expect(report.totals.sgst).toBeCloseTo(120, 1);
    expect(report.totals.igst).toBeCloseTo(180, 1);

    const csv = service.formatGstr1Csv(report);
    expect(csv).toContain('HSN,Category,GST Rate (%)');
    expect(csv).toContain('3304,cosmetics,18');
    expect(csv).toContain('5007,saree,12');
  });
});
