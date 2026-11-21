import { ShiprocketShippingProvider } from './shiprocket.provider';

describe('ShiprocketShippingProvider', () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('falls back to ConfigShippingProvider when Shiprocket credentials are not configured', async () => {
    const provider = new ShiprocketShippingProvider(
      { freeShippingThreshold: 999, baseCharge: 65 },
      { email: '', password: '' },
    );

    expect(provider.isConfigured()).toBe(false);
    expect(await provider.calculateCharge(500, '600001')).toBe(65);
    expect(await provider.calculateCharge(1200, '600001')).toBe(0);
  });

  it('authenticates and picks the lowest-rate live courier when configured', async () => {
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ token: 'sr-jwt-token' }),
      } as any)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          data: {
            available_courier_companies: [
              { courier_name: 'BlueDart', rate: 92, estimated_delivery_days: '3', cod: 1 },
              { courier_name: 'Delhivery Surface', rate: 58, estimated_delivery_days: '4', cod: 1 },
            ],
          },
        }),
      } as any);

    const provider = new ShiprocketShippingProvider(
      { freeShippingThreshold: 1999, baseCharge: 80 },
      { email: 'ops@beautyqueen.in', password: 'secret', pickupPincode: '600001' },
    );

    const rate = await provider.calculateCharge(799, '560001');
    expect(rate).toBe(58);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it('gracefully falls back to config charge if Shiprocket API errors', async () => {
    jest.spyOn(global, 'fetch').mockRejectedValue(new Error('Network down'));

    const provider = new ShiprocketShippingProvider(
      { freeShippingThreshold: 1999, baseCharge: 75 },
      { email: 'ops@beautyqueen.in', password: 'secret' },
    );

    expect(await provider.calculateCharge(799, '560001')).toBe(75);
  });
});
