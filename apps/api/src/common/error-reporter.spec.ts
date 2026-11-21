import { reportServerError } from './error-reporter';

describe('reportServerError', () => {
  const origEnv = process.env.ALERT_WEBHOOK_URL;

  afterEach(() => {
    process.env.ALERT_WEBHOOK_URL = origEnv;
    jest.restoreAllMocks();
  });

  it('no-ops cleanly when ALERT_WEBHOOK_URL is unset', async () => {
    delete process.env.ALERT_WEBHOOK_URL;
    const fetchSpy = jest.spyOn(global, 'fetch');

    const sent = await reportServerError({
      status: 500,
      name: 'Error',
      message: 'boom',
      environment: 'test',
      timestamp: new Date().toISOString(),
    });

    expect(sent).toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it('posts a sanitized alert payload when ALERT_WEBHOOK_URL is configured', async () => {
    process.env.ALERT_WEBHOOK_URL = 'https://alerts.beautyqueen.in/hook';
    const fetchSpy = jest.spyOn(global, 'fetch').mockResolvedValue({ ok: true, status: 200 } as any);

    const sent = await reportServerError({
      requestId: 'req-99',
      method: 'POST',
      path: '/api/payments/checkout',
      status: 500,
      name: 'DatabaseError',
      message: 'Connection lost',
      environment: 'production',
      timestamp: '2026-11-21T00:00:00.000Z',
    });

    expect(sent).toBe(true);
    expect(fetchSpy).toHaveBeenCalledWith(
      'https://alerts.beautyqueen.in/hook',
      expect.objectContaining({ method: 'POST' }),
    );
  });
});
