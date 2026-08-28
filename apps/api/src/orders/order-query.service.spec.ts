import { OrderQueryService } from './order-query.service';

describe('OrderQueryService', () => {
  let service: OrderQueryService;
  let prisma: any;

  beforeEach(() => {
    prisma = {
      order: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
    };
    service = new OrderQueryService(prisma);
  });

  describe('buildWhere', () => {
    it('maps status and paymentStatus filters', () => {
      const where = service.buildWhere({
        status: 'Shipped',
        paymentStatus: 'Completed',
      });
      expect(where.status).toBe('Shipped');
      expect(where.paymentStatus).toBe('Completed');
    });

    it('maps date range to orderDate gte/lte bounds', () => {
      const where = service.buildWhere({
        dateFrom: '2026-01-01',
        dateTo: '2026-01-31',
      });
      expect((where.orderDate as any).gte).toEqual(new Date('2026-01-01T00:00:00'));
      expect((where.orderDate as any).lte).toEqual(new Date('2026-01-31T23:59:59'));
    });

    it('builds OR search across relevant fields with numeric id', () => {
      const where = service.buildWhere({ search: '42' });
      expect(where.OR).toBeDefined();
      expect(where.OR).toContainEqual({ id: 42 });
      expect(where.OR).toContainEqual({ trackingNumber: { contains: '42' } });
    });

    it('filters by sellerId when provided', () => {
      const where = service.buildWhere({ sellerId: 7 });
      expect(where.sellerId).toBe(7);
    });

    it('leaves empty where for no filters', () => {
      expect(service.buildWhere({})).toEqual({});
    });
  });

  describe('paginate', () => {
    it('returns data with pagination metadata', async () => {
      prisma.order.count.mockResolvedValue(25);
      prisma.order.findMany.mockResolvedValue([{ id: 1 }, { id: 2 }]);

      const result = await service.paginate({}, { page: 3, limit: 10 });
      expect(result.pagination).toEqual({
        page: 3,
        limit: 10,
        total: 25,
        totalPages: 3,
      });
      expect(result.data).toHaveLength(2);
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 }),
      );
    });

    it('clamps page and limit to safe bounds', async () => {
      prisma.order.count.mockResolvedValue(0);
      prisma.order.findMany.mockResolvedValue([]);
      await service.paginate({}, { page: 0, limit: 9999 });
      expect(prisma.order.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 100 }),
      );
    });
  });
});
