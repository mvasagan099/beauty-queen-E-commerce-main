import { WhatsAppService } from './whatsapp.service';

describe('WhatsAppService', () => {
  const origId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const origToken = process.env.WHATSAPP_ACCESS_TOKEN;

  afterEach(() => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = origId;
    process.env.WHATSAPP_ACCESS_TOKEN = origToken;
    jest.restoreAllMocks();
  });

  it('normalizes 10-digit Indian mobile numbers to 91 prefix and rejects invalid numbers', () => {
    const svc = new WhatsAppService();
    expect(svc.normalizeIndianPhone('9876543210')).toBe('919876543210');
    expect(svc.normalizeIndianPhone('+91 98765-43210')).toBe('919876543210');
    expect(svc.normalizeIndianPhone('12345')).toBeNull();
  });

  it('gracefully no-ops when WhatsApp credentials are unset', async () => {
    delete process.env.WHATSAPP_PHONE_NUMBER_ID;
    delete process.env.WHATSAPP_ACCESS_TOKEN;
    const svc = new WhatsAppService();

    const res = await svc.sendOrderConfirmation('9876543210', 101, 2499);
    expect(res).toEqual({ sent: false, skippedReason: 'not_configured' });
  });

  it('dispatches message via Meta Graph API when configured', async () => {
    process.env.WHATSAPP_PHONE_NUMBER_ID = '1234567890';
    process.env.WHATSAPP_ACCESS_TOKEN = 'wa-token';
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ messages: [{ id: 'wamid.abc123' }] }),
    } as any);

    const svc = new WhatsAppService();
    const res = await svc.sendCodVerificationPrompt('9876543210', 42, 1899);

    expect(res).toEqual({ sent: true, providerMessageId: 'wamid.abc123' });
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/1234567890/messages'),
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
