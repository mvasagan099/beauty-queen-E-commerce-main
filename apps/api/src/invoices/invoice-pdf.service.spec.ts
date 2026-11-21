import { InvoicePdfService, GstInvoicePayload } from './invoice-pdf.service';

describe('InvoicePdfService', () => {
  let service: InvoicePdfService;

  const basePayload: GstInvoicePayload = {
    invoiceNumber: 'BQ-2026-000042',
    orderId: 42,
    issuedAt: '2026-09-10T10:00:00.000Z',
    recipientName: 'Priya Raman',
    recipientEmail: 'priya@example.com',
    billingAddress: {
      address: '14 Anna Nagar',
      district: 'Chennai, Tamil Nadu',
      pincode: '600040',
    },
    items: [
      {
        name: 'Kanjeevaram Silk Saree',
        size: 'FREE_SIZE',
        quantity: 1,
        unitPrice: 4899,
        subtotal: 4899,
      },
    ],
    subtotal: 4899,
    discountAmount: 1600,
    couponCode: null,
    couponDiscount: 0,
    shippingAmount: 0,
    taxAmount: 245,
    totalAmount: 5144,
    paymentMethod: 'UPI',
    paymentStatus: 'Completed',
  };

  beforeEach(() => {
    service = new InvoicePdfService();
  });

  it('splits GST into CGST + SGST for Tamil Nadu (intra-state) orders with saree HSN 5407', () => {
    const gst = service.calculateGstBreakdown(basePayload);
    expect(gst.isIntraState).toBe(true);
    expect(gst.hsnCode).toBe('5407');
    expect(gst.cgstAmount).toBe(122.5);
    expect(gst.sgstAmount).toBe(122.5);
    expect(gst.igstAmount).toBe(0);
  });

  it('applies IGST for inter-state orders (e.g., Mumbai 400001) and cosmetics HSN 3304', () => {
    const gst = service.calculateGstBreakdown({
      ...basePayload,
      billingAddress: { address: 'Bandra', district: 'Mumbai', pincode: '400050' },
      items: [
        { name: 'Velvet Matte Lipstick Cosmetics', size: 'FREE_SIZE', quantity: 1, unitPrice: 899, subtotal: 899 },
      ],
      subtotal: 899,
      taxAmount: 162,
      totalAmount: 1061,
    });
    expect(gst.isIntraState).toBe(false);
    expect(gst.hsnCode).toBe('3304');
    expect(gst.igstAmount).toBe(162);
    expect(gst.cgstAmount).toBe(0);
  });

  it('renders a valid PDF 1.4 binary buffer containing invoice details', () => {
    const buffer = service.generatePdf(basePayload);
    expect(Buffer.isBuffer(buffer)).toBe(true);
    const text = buffer.toString('utf8');
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('BQ-2026-000042');
    expect(text).toContain('Kanjeevaram Silk Saree');
    expect(text).toContain('5407');
    expect(text.trim().endsWith('%%EOF')).toBe(true);
  });

  it('renders an escaped printable HTML GST invoice', () => {
    const html = service.renderHtmlInvoice({
      ...basePayload,
      recipientName: '<script>alert(1)</script>',
    });
    expect(html).toContain('BQ-2026-000042');
    expect(html).not.toContain('<script>alert(1)</script>');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;');
  });
});
