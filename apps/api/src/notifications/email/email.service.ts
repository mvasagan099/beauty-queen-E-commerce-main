import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { EmailJobPayload } from '../types/notification.types';
import { renderEmailTemplate, getEmailSubject } from '../templates';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly brevoApiKey: string;
  private readonly senderName: string;
  private readonly senderEmail: string;

  constructor(private configService: ConfigService) {
    this.brevoApiKey = this.configService.get<string>('BREVO_API_KEY', '');
    this.senderName = this.configService.get<string>('EMAIL_SENDER_NAME', 'Beauty Queen');
    this.senderEmail = this.configService.get<string>('EMAIL_SENDER_EMAIL', 'noreply@beautyqueen.com');
  }

  async sendEmail(payload: EmailJobPayload): Promise<boolean> {
    if (!this.brevoApiKey) {
      this.logger.warn(`Brevo API key not configured, skipping email: ${payload.type} to ${payload.to}`);
      return false;
    }

    try {
      const subject = getEmailSubject(payload.type, payload.data);
      const htmlContent = renderEmailTemplate(payload.type, payload.data);

      const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'accept': 'application/json',
          'api-key': this.brevoApiKey,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          sender: { name: this.senderName, email: this.senderEmail },
          to: [{ email: payload.to }],
          subject,
          htmlContent,
          headers: {
            'X-Event-Id': payload.eventId,
          },
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        this.logger.error(`Brevo API error: ${response.status} - ${errorText}`);
        throw new Error(`Brevo API error: ${response.status}`);
      }

      this.logger.log(`Email sent: ${payload.type} to ${payload.to}, eventId: ${payload.eventId}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to send email to ${payload.to}: ${error.message}`);
      throw error;
    }
  }

  get isConfigured(): boolean {
    return !!this.brevoApiKey;
  }
}
