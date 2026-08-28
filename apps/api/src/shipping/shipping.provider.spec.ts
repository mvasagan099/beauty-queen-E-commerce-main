import { ConfigShippingProvider } from './shipping.provider';

describe('ConfigShippingProvider', () => {
  it('charges base fee below the free-shipping threshold', async () => {
    const provider = new ConfigShippingProvider({
      freeShippingThreshold: 499,
      baseCharge: 49,
    });
    await expect(provider.calculateCharge(200)).resolves.toBe(49);
  });

  it('gives free shipping at or above the threshold', async () => {
    const provider = new ConfigShippingProvider({
      freeShippingThreshold: 499,
      baseCharge: 49,
    });
    await expect(provider.calculateCharge(499)).resolves.toBe(0);
    await expect(provider.calculateCharge(800)).resolves.toBe(0);
  });

  it('applies zone override by pincode prefix', async () => {
    const provider = new ConfigShippingProvider({
      freeShippingThreshold: 0,
      baseCharge: 49,
      zoneOverrides: { '110': 20 },
    });
    await expect(provider.calculateCharge(100, '110001')).resolves.toBe(20);
    await expect(provider.calculateCharge(100, '400001')).resolves.toBe(49);
  });

  it('returns 0 when no config is provided', async () => {
    const provider = new ConfigShippingProvider(null);
    await expect(provider.calculateCharge(100)).resolves.toBe(0);
  });
});
