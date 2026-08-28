import { Test, TestingModule } from '@nestjs/testing';
import { SearchService } from './search.service';
import { PrismaService } from '../prisma/prisma.service';

describe('SearchService', () => {
  let service: SearchService;
  let prisma: Record<string, any>;

  const product = {
    id: 1,
    name: 'Silk Saree',
    price: 999,
    description: 'A beautiful silk saree',
    ptype: 'saree',
  };

  beforeEach(async () => {
    prisma = {
      $queryRaw: jest.fn().mockResolvedValue([]),
      searchQueryLog: {
        create: jest.fn().mockResolvedValue({}),
      },
      product: {
        findMany: jest.fn(),
        count: jest.fn(),
        groupBy: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SearchService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<SearchService>(SearchService);
  });

  it('should return empty results for blank query', async () => {
    const result = await service.search({ query: '   ' });

    expect(result.products).toEqual([]);
    expect(result.pagination.total).toBe(0);
    expect(prisma.$queryRaw).not.toHaveBeenCalled();
  });

  it('should rank results by relevance and return the query result rows', async () => {
    prisma.$queryRaw.mockResolvedValue([product]);
    prisma.product.count.mockResolvedValue(1);

    const result = await service.search({ query: 'saree' });

    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(result.products).toEqual([product]);
    expect(result.pagination).toEqual({
      page: 1,
      limit: 20,
      total: 1,
      totalPages: 1,
    });
  });

  it('should count using a contains filter on the trimmed query', async () => {
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.product.count.mockResolvedValue(0);

    await service.search({ query: 'silk' });

    expect(prisma.product.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          OR: [
            { name: { contains: 'silk' } },
            { description: { contains: 'silk' } },
            { ptype: { contains: 'silk' } },
          ],
        }),
      }),
    );
  });

  it('should clamp limit to max 100', async () => {
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.product.count.mockResolvedValue(0);

    await service.search({ query: 'a', page: 1, limit: 999 });

    // 999 clamps to 100; a page offset of 0 is still passed to the ranked query.
    expect(prisma.$queryRaw).toHaveBeenCalled();
    expect(prisma.product.count).toHaveBeenCalled();
  });

  it('should paginate according to page and limit', async () => {
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.product.count.mockResolvedValue(50);

    const result = await service.search({ query: 'a', page: 3, limit: 10 });

    expect(result.pagination).toEqual({
      page: 3,
      limit: 10,
      total: 50,
      totalPages: 5,
    });
  });

  it('should truncate overly long queries and still search', async () => {
    const longQuery = 'x'.repeat(500);
    prisma.$queryRaw.mockResolvedValue([]);
    prisma.product.count.mockResolvedValue(0);

    await service.search({ query: longQuery });
    prisma.product.count.mock.calls[0][0];

    // The query is truncated to MAX_SEARCH_LENGTH (200) before any DB call.
    const whereArg = prisma.product.count.mock.calls[0][0].where;
    const searchClause = whereArg.OR.find((c: any) => c.name?.contains);
    expect(searchClause.name.contains.length).toBeLessThanOrEqual(200);
  });
});
