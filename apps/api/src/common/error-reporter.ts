import { logger } from './logger';

export interface ErrorReportPayload {
  requestId?: string;
  path?: string;
  method?: string;
  status: number;
  name: string;
  message: string;
  environment: string;
  timestamp: string;
}

/**
 * Lightweight, zero-dependency error alerting hook for unhandled 5xx errors.
 * Sends a sanitized JSON alert to ALERT_WEBHOOK_URL (Slack / Discord / PagerDuty / custom webhook)
 * when configured, without ever blocking or throwing inside the HTTP exception filter.
 */
export async function reportServerError(payload: ErrorReportPayload): Promise<boolean> {
  const webhookUrl = process.env.ALERT_WEBHOOK_URL?.trim();
  if (!webhookUrl) {
    return false;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: `[Beauty Queen ${payload.environment}] ${payload.status} ${payload.name} on ${payload.method || 'HTTP'} ${payload.path || '/'} (req=${payload.requestId || 'n/a'}): ${payload.message}`,
        ...payload,
      }),
    });
    if (!res.ok) {
      logger.warn({ status: res.status }, 'Alert webhook returned non-2xx');
      return false;
    }
    return true;
  } catch (err: any) {
    logger.warn({ err: err?.message }, 'Failed to dispatch error alert webhook');
    return false;
  }
}
