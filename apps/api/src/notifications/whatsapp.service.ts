import { Injectable, Logger } from '@nestjs/common';

export interface WhatsAppSendResult {
  sent: boolean;
  providerMessageId?: string;
  skippedReason?: string;
}

/**
 * Meta WhatsApp Business Cloud API adapter for Indian D2C commerce updates:
 * - Order confirmations & shipping tracking
 * - 1-tap Cash on Delivery (COD) confirmation prompts (reduces RTO)
 * - Abandoned cart recovery nudges
 *
 * Gracefully no-ops when WHATSAPP_PHONE_NUMBER_ID / WHATSAPP_ACCESS_TOKEN are unset.
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiVersion = process.env.WHATSAPP_API_VERSION || 'v20.0';

  isConfigured(): boolean {
    return Boolean(
      process.env.WHATSAPP_PHONE_NUMBER_ID && process.env.WHATSAPP_ACCESS_TOKEN,
    );
  }

  normalizeIndianPhone(raw: string): string | null {
    const digits = (raw || '').replace(/\D/g, '');
    if (digits.length === 10 && /^[6-9]\d{9}$/.test(digits)) {
      return `91${digits}`;
    }
    if (digits.length === 12 && digits.startsWith('91')) {
      return digits;
    }
    return null;
  }

  async sendTextMessage(phone: string, body: string): Promise<WhatsAppSendResult> {
    if (!this.isConfigured()) {
      this.logger.debug('WhatsApp credentials not configured — skipping dispatch');
      return { sent: false, skippedReason: 'not_configured' };
    }

    const to = this.normalizeIndianPhone(phone);
    if (!to) {
      return { sent: false, skippedReason: 'invalid_phone' };
    }

    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID!;
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN!;
    const endpoint = `https://graph.facebook.com/${this.apiVersion}/${phoneNumberId}/messages`;

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to,
          type: 'text',
          text: { preview_url: false, body },
        }),
      });

      if (!res.ok) {
        this.logger.warn(`WhatsApp Cloud API returned HTTP ${res.status}`);
        return { sent: false, skippedReason: `http_${res.status}` };
      }

      const data = (await res.json()) as { messages?: { id?: string }[] };
      return {
        sent: true,
        providerMessageId: data?.messages?.[0]?.id,
      };
    } catch (err: any) {
      this.logger.warn(`WhatsApp dispatch error: ${err?.message}`);
      return { sent: false, skippedReason: 'network_error' };
    }
  }

  async sendOrderConfirmation(phone: string, orderId: number, totalAmount: number) {
    return this.sendTextMessage(
      phone,
      `Beauty Queen — Order #${orderId} confirmed! Payable amount: ₹${totalAmount.toLocaleString('en-IN')}. We will notify you as soon as it ships. Your Beauty, Our Priority.`,
    );
  }

  async sendCodVerificationPrompt(phone: string, orderId: number, totalAmount: number) {
    return this.sendTextMessage(
      phone,
      `Beauty Queen COD Confirmation: Please reply YES to confirm Cash on Delivery Order #${orderId} (₹${totalAmount.toLocaleString('en-IN')}) so we can dispatch it promptly.`,
    );
  }
}
