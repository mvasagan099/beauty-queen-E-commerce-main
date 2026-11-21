import { Injectable } from '@nestjs/common';

export interface GstInvoiceLineItem {
  name: string;
  size?: string | null;
  quantity: number;
  unitPrice: number;
  subtotal: number;
  discount?: number;
  hsnCode?: string;
}

export interface GstInvoicePayload {
  invoiceNumber: string;
  orderId: number;
  issuedAt: Date | string;
  recipientName?: string | null;
  recipientEmail?: string | null;
  billingAddress?: {
    address?: string | null;
    pincode?: string | null;
    district?: string | null;
    landmark?: string | null;
  } | null;
  items: GstInvoiceLineItem[];
  subtotal: number;
  discountAmount: number;
  couponCode?: string | null;
  couponDiscount: number;
  shippingAmount: number;
  taxAmount: number;
  totalAmount: number;
  paymentMethod?: string | null;
  paymentStatus?: string | null;
  categoryHint?: string | null;
}

export interface GstBreakdown {
  isIntraState: boolean;
  taxableValue: number;
  cgstAmount: number;
  sgstAmount: number;
  igstAmount: number;
  totalTax: number;
  hsnCode: string;
}

function resolveHsnCode(categoryOrName: string): string {
  const lower = (categoryOrName || '').toLowerCase();
  if (lower.includes('saree')) return '5407';
  if (lower.includes('cosmetic') || lower.includes('lip') || lower.includes('kajal') || lower.includes('serum')) {
    return '3304';
  }
  return '6204';
}

function escapePdfText(input: string): string {
  // Strip non-ASCII glyphs (like ₹) into clean ASCII "Rs." for Type1 Helvetica PDF compatibility
  const ascii = input
    .replace(/₹/g, 'Rs. ')
    .replace(/[^\x20-\x7E]/g, ' ');
  return ascii.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function escapeHtml(input: unknown): string {
  return String(input ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

@Injectable()
export class InvoicePdfService {
  private readonly storeName =
    process.env.STORE_LEGAL_NAME || 'Beauty Queen Fashion & Cosmetics';
  private readonly storeGstin =
    process.env.STORE_GSTIN || '33AAACB0000A1Z5';
  private readonly storeAddress =
    process.env.NEXT_PUBLIC_STORE_ADDRESS ||
    '123 Main Street, Chennai, Tamil Nadu - 600001';

  calculateGstBreakdown(payload: GstInvoicePayload): GstBreakdown {
    const pincode = String(payload.billingAddress?.pincode || '').trim();
    const district = String(payload.billingAddress?.district || '').toLowerCase();
    // Tamil Nadu pincodes begin with 60–64
    const prefix = Number(pincode.substring(0, 2));
    const isIntraState =
      (prefix >= 60 && prefix <= 64) || district.includes('tamil nadu') || district.includes('chennai');

    const totalTax = Math.max(0, Number(payload.taxAmount || 0));
    const taxableValue = Math.max(
      0,
      Number(payload.subtotal || 0) - Number(payload.couponDiscount || 0),
    );

    const cgstAmount = isIntraState ? Number((totalTax / 2).toFixed(2)) : 0;
    const sgstAmount = isIntraState ? Number((totalTax - cgstAmount).toFixed(2)) : 0;
    const igstAmount = isIntraState ? 0 : Number(totalTax.toFixed(2));

    const firstItemName = payload.items?.[0]?.name || payload.categoryHint || '';
    const hsnCode = payload.items?.[0]?.hsnCode || resolveHsnCode(firstItemName);

    return {
      isIntraState,
      taxableValue,
      cgstAmount,
      sgstAmount,
      igstAmount,
      totalTax,
      hsnCode,
    };
  }

  /**
   * Builds a standards-compliant, zero-dependency A4 PDF 1.4 tax invoice buffer.
   */
  generatePdf(payload: GstInvoicePayload): Buffer {
    const gst = this.calculateGstBreakdown(payload);
    const issuedDate = new Date(payload.issuedAt).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });

    const commands: string[] = [];
    const addText = (x: number, y: number, size: number, text: string, bold = false) => {
      commands.push(
        `BT /${bold ? 'F2' : 'F1'} ${size} Tf 1 0 0 1 ${x} ${y} Tm (${escapePdfText(text)}) Tj ET`,
      );
    };
    const addLine = (x1: number, y1: number, x2: number, y2: number) => {
      commands.push(`0.7 w 0.82 0.76 0.72 RG ${x1} ${y1} m ${x2} ${y2} l S`);
    };

    // Header band
    commands.push('0.10 0.04 0.06 rg 0 760 595 82 re f');
    commands.push('0.98 0.97 0.95 rg');
    addText(40, 808, 22, 'BEAUTY QUEEN', true);
    commands.push('0.83 0.64 0.33 rg');
    addText(40, 788, 10, 'Your Beauty, Our Priority  |  TAX INVOICE (GST)');
    commands.push('0.98 0.97 0.95 rg');
    addText(395, 808, 11, `Invoice: ${payload.invoiceNumber}`, true);
    addText(395, 790, 9, `Date: ${issuedDate}`);
    addText(395, 775, 9, `Order ID: #${payload.orderId}`);

    // Body ink
    commands.push('0.18 0.11 0.13 rg');

    // Seller & Buyer blocks
    addText(40, 732, 10, 'SOLD BY', true);
    addText(40, 716, 10, this.storeName, true);
    addText(40, 702, 9, this.storeAddress.slice(0, 56));
    addText(40, 688, 9, `GSTIN: ${this.storeGstin}`);

    addText(320, 732, 10, 'BILL TO', true);
    addText(320, 716, 10, payload.recipientName || 'Customer', true);
    addText(320, 702, 9, payload.recipientEmail || '');
    const addrLine = [
      payload.billingAddress?.address,
      payload.billingAddress?.district,
      payload.billingAddress?.pincode,
    ]
      .filter(Boolean)
      .join(', ');
    addText(320, 688, 9, addrLine.slice(0, 48));

    addLine(40, 668, 555, 668);

    // Table Header
    addText(40, 648, 9, 'ITEM DESCRIPTION', true);
    addText(260, 648, 9, 'HSN', true);
    addText(310, 648, 9, 'FIT', true);
    addText(370, 648, 9, 'QTY', true);
    addText(415, 648, 9, 'UNIT PRICE', true);
    addText(495, 648, 9, 'AMOUNT', true);
    addLine(40, 640, 555, 640);

    let y = 620;
    const items = Array.isArray(payload.items) ? payload.items : [];
    for (const item of items.slice(0, 12)) {
      const hsn = item.hsnCode || resolveHsnCode(item.name);
      const fit = item.size === 'FREE_SIZE' ? 'Free Size' : item.size || 'Std';
      addText(40, y, 9, (item.name || 'Product').slice(0, 38));
      addText(260, y, 9, hsn);
      addText(310, y, 9, fit);
      addText(375, y, 9, String(item.quantity || 1));
      addText(415, y, 9, `Rs. ${Number(item.unitPrice || 0).toFixed(2)}`);
      addText(495, y, 9, `Rs. ${Number(item.subtotal || 0).toFixed(2)}`);
      y -= 20;
    }

    addLine(40, y + 6, 555, y + 6);
    y -= 18;

    // Summary & GST breakdown
    const addSummaryRow = (label: string, value: string, bold = false) => {
      addText(340, y, bold ? 11 : 9, label, bold);
      addText(475, y, bold ? 11 : 9, value, bold);
      y -= 17;
    };

    addSummaryRow('Taxable Subtotal:', `Rs. ${gst.taxableValue.toFixed(2)}`);
    if (payload.couponDiscount > 0) {
      addSummaryRow(
        `Coupon (${payload.couponCode || 'PROMO'}):`,
        `-Rs. ${Number(payload.couponDiscount).toFixed(2)}`,
      );
    }
    if (gst.isIntraState) {
      addSummaryRow('CGST:', `Rs. ${gst.cgstAmount.toFixed(2)}`);
      addSummaryRow('SGST:', `Rs. ${gst.sgstAmount.toFixed(2)}`);
    } else {
      addSummaryRow('IGST:', `Rs. ${gst.igstAmount.toFixed(2)}`);
    }
    addSummaryRow(
      'Shipping:',
      payload.shippingAmount > 0 ? `Rs. ${Number(payload.shippingAmount).toFixed(2)}` : 'Free',
    );
    addLine(340, y + 8, 555, y + 8);
    y -= 6;
    addSummaryRow('GRAND TOTAL:', `Rs. ${Number(payload.totalAmount || 0).toFixed(2)}`, true);

    // Payment metadata footer
    y -= 18;
    addText(
      40,
      Math.max(110, y),
      9,
      `Payment Method: ${payload.paymentMethod || 'N/A'}   |   Payment Status: ${payload.paymentStatus || 'Pending'}`,
    );
    addLine(40, 78, 555, 78);
    addText(
      40,
      58,
      8,
      'This is a computer-generated GST tax invoice issued by Beauty Queen. No physical signature required.',
    );

    const stream = commands.join('\n');
    const streamLen = Buffer.byteLength(stream, 'utf8');

    const objects = [
      '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n',
      '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n',
      '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>\nendobj\n',
      '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj\n',
      '5 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>\nendobj\n',
      `6 0 obj\n<< /Length ${streamLen} >>\nstream\n${stream}\nendstream\nendobj\n`,
    ];

    let pdf = '%PDF-1.4\n';
    const offsets: number[] = [0];
    for (const obj of objects) {
      offsets.push(Buffer.byteLength(pdf, 'utf8'));
      pdf += obj;
    }

    const xrefStart = Buffer.byteLength(pdf, 'utf8');
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += '0000000000 65535 f \n';
    for (let i = 1; i < offsets.length; i++) {
      pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

    return Buffer.from(pdf, 'utf8');
  }

  renderHtmlInvoice(payload: GstInvoicePayload): string {
    const gst = this.calculateGstBreakdown(payload);
    const issuedDate = new Date(payload.issuedAt).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
    const rows = (payload.items || [])
      .map((item) => {
        const hsn = item.hsnCode || resolveHsnCode(item.name);
        const fit = item.size === 'FREE_SIZE' ? 'Free Size' : item.size || 'Std';
        return `<tr>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(hsn)}</td>
          <td>${escapeHtml(fit)}</td>
          <td style="text-align:right">${Number(item.quantity || 1)}</td>
          <td style="text-align:right">₹${Number(item.unitPrice || 0).toFixed(2)}</td>
          <td style="text-align:right">₹${Number(item.subtotal || 0).toFixed(2)}</td>
        </tr>`;
      })
      .join('');

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>Tax Invoice ${escapeHtml(payload.invoiceNumber)} — Beauty Queen</title>
  <style>
    body { font-family: system-ui, -apple-system, sans-serif; color: #2D1B22; background: #FBF7F2; margin: 0; padding: 32px; }
    .sheet { max-width: 780px; margin: 0 auto; background: #fff; border: 1px solid #e6ddd4; border-radius: 10px; overflow: hidden; }
    .head { background: #1A0B10; color: #FBF7F2; padding: 24px 28px; display: flex; justify-content: space-between; align-items: center; }
    .brand { font-family: Georgia, serif; font-size: 26px; font-weight: 600; margin: 0; }
    .motto { color: #D4A353; font-size: 12px; margin-top: 4px; }
    .body { padding: 28px; }
    .cols { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 24px; font-size: 13px; }
    table { width: 100%; border-collapse: collapse; font-size: 13px; margin-top: 12px; }
    th, td { border-bottom: 1px solid #eee5dc; padding: 10px 8px; text-align: left; }
    th { background: #f7f1ea; font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; }
    .totals { margin-left: auto; width: 290px; margin-top: 20px; font-size: 13px; }
    .totals div { display: flex; justify-content: space-between; padding: 5px 0; }
    .grand { border-top: 2px solid #2D1B22; margin-top: 6px; padding-top: 10px !important; font-weight: 700; font-size: 15px; color: #A81C44; }
    .foot { margin-top: 28px; font-size: 11px; color: #6B535B; border-top: 1px solid #eee5dc; padding-top: 14px; }
    @media print { body { background: #fff; padding: 0; } .sheet { border: none; } }
  </style>
</head>
<body>
  <div class="sheet">
    <div class="head">
      <div>
        <h1 class="brand">Beauty Queen</h1>
        <div class="motto">Your Beauty, Our Priority — GST Tax Invoice</div>
      </div>
      <div style="text-align:right;font-size:12px;line-height:1.6">
        <div><strong>${escapeHtml(payload.invoiceNumber)}</strong></div>
        <div>Date: ${escapeHtml(issuedDate)}</div>
        <div>Order #${payload.orderId}</div>
      </div>
    </div>
    <div class="body">
      <div class="cols">
        <div>
          <strong>Sold By</strong><br/>
          ${escapeHtml(this.storeName)}<br/>
          ${escapeHtml(this.storeAddress)}<br/>
          GSTIN: <strong>${escapeHtml(this.storeGstin)}</strong>
        </div>
        <div>
          <strong>Bill To</strong><br/>
          ${escapeHtml(payload.recipientName || 'Customer')}<br/>
          ${escapeHtml(payload.recipientEmail || '')}<br/>
          ${escapeHtml([payload.billingAddress?.address, payload.billingAddress?.district, payload.billingAddress?.pincode].filter(Boolean).join(', '))}
        </div>
      </div>
      <table>
        <thead>
          <tr><th>Item</th><th>HSN</th><th>Fit</th><th style="text-align:right">Qty</th><th style="text-align:right">Price</th><th style="text-align:right">Amount</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="totals">
        <div><span>Taxable Subtotal</span><span>₹${gst.taxableValue.toFixed(2)}</span></div>
        ${gst.isIntraState ? `<div><span>CGST</span><span>₹${gst.cgstAmount.toFixed(2)}</span></div><div><span>SGST</span><span>₹${gst.sgstAmount.toFixed(2)}</span></div>` : `<div><span>IGST</span><span>₹${gst.igstAmount.toFixed(2)}</span></div>`}
        <div><span>Shipping</span><span>${payload.shippingAmount > 0 ? `₹${Number(payload.shippingAmount).toFixed(2)}` : 'Free'}</span></div>
        <div class="grand"><span>Grand Total</span><span>₹${Number(payload.totalAmount || 0).toFixed(2)}</span></div>
      </div>
      <div class="foot">
        Payment Method: ${escapeHtml(payload.paymentMethod || 'N/A')} · Status: ${escapeHtml(payload.paymentStatus || 'Pending')}<br/>
        Computer-generated GST invoice issued by Beauty Queen. No signature required.
      </div>
    </div>
  </div>
</body>
</html>`;
  }
}
