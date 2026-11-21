import { StockReservationService } from './stock-reservation.service';

describe('StockReservationService', () => {
  let service: StockReservationService;
  let store: Map<string, string>;
  let redisMock: {
    get: jest.Mock;
    set: jest.Mock;
    del: jest.Mock;
  };

  beforeEach(() => {
    store = new Map();
    redisMock = {
      get: jest.fn(async (key: string) => store.get(key) ?? null),
      set: jest.fn(async (key: string, value: string) => {
        store.set(key, value);
      }),
      del: jest.fn(async (key: string) => {
        store.delete(key);
      }),
    };

    service = new StockReservationService(redisMock as any);
  });

  it('reserves stock across sized and FREE_SIZE items and sums active holds', async () => {
    await service.reserve('chk-1', [
      { productId: 10, size: 'M', quantity: 2 },
      { productId: 20, size: 'Free Size', quantity: 1 },
    ]);
    await service.reserve('chk-2', [
      { productId: 10, size: 'Medium', quantity: 1 },
    ]);

    expect(await service.getReservedQuantity(10, 'M')).toBe(3);
    expect(await service.getReservedQuantity(20, 'FREE_SIZE')).toBe(1);
    expect(await service.getReservedQuantity(10, 'L')).toBe(0);
  });

  it('releases reservations cleanly and updates active hold counts', async () => {
    await service.reserve('chk-1', [{ productId: 10, size: 'S', quantity: 2 }]);
    expect(await service.getReservedQuantity(10, 'S')).toBe(2);

    await service.release('chk-1');

    expect(await service.getReservation('chk-1')).toBeNull();
    expect(await service.getReservedQuantity(10, 'S')).toBe(0);
  });

  it('ignores and cleans up expired reservations', async () => {
    const expiredRecord = {
      checkoutId: 'chk-expired',
      items: [{ productId: 99, size: 'L', quantity: 4 }],
      expiresAt: Date.now() - 1000,
    };
    store.set('stock:reservation:chk-expired', JSON.stringify(expiredRecord));
    store.set('stock:reservations:active', JSON.stringify(['chk-expired']));

    expect(await service.getReservedQuantity(99, 'L')).toBe(0);
    expect(await service.getReservation('chk-expired')).toBeNull();
  });
});
