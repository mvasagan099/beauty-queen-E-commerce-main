import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service';
import { PrismaService } from '../prisma/prisma.service';
import { ImageService } from '../common/image.service';
import { SearchService } from '../search/search.service';
import { AuditService } from '../audit/audit.service';
import { NotFoundException } from '@nestjs/common';

describe('ProductsService', () => {
  let service: ProductsService;
  let prisma: Record<string, any>;
  let searchService: Record<string, any>;
  let auditService: Record<string, any>;

  const inStockProduct = {
    id: 1,
    name: 'Silk Saree',
    price: 999,
    mrp: 1499,
    description: 'A beautiful silk saree',
    ptype: 'saree',
    sizeS: 0,
    sizeM: 5,
    sizeL: 3,
    sizeXl: 0,
    sizeXxl: 0,
    quantity: 0,
    sellerId: 1,
    deletedAt: null,
  };

  const sameTypeProduct = {
    ...inStockProduct,
    id: 2,
    name: 'Cotton Saree',
    price: 799,
    sizeM: 2,
  };

  const diffTypeProduct = {
    ...inStockProduct,
    id: 3,
    name: 'Cotton Kurthi',
    price: 500,
    ptype: 'kurthi',
    sizeM: 4,
  };

  beforeEach(async () => {
    prisma = {
      product: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    };

    searchService = {
      search: jest.fn(),
    };

    auditService = {
      log: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: prisma },
        { provide: ImageService, useValue: {} },
        { provide: SearchService, useValue: searchService },
        { provide: AuditService, useValue: auditService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
  });

  describe('getRelatedProducts', () => {
    it('should prefer products of the same category', async () => {
      prisma.product.findFirst.mockResolvedValue(inStockProduct);
      prisma.product.findMany
        .mockResolvedValueOnce([sameTypeProduct]) // same ptype query
        .mockResolvedValueOnce([]); // filler query not needed

      const result = await service.getRelatedProducts(1, 4);

      expect(result).toEqual([sameTypeProduct]);
      expect(prisma.product.findMany).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          where: expect.objectContaining({ ptype: 'saree', id: { not: 1 } }),
        }),
      );
    });

    it('should fill remaining slots with other in-stock products', async () => {
      prisma.product.findFirst.mockResolvedValue(inStockProduct);
      prisma.product.findMany
        .mockResolvedValueOnce([sameTypeProduct]) // only 1 same-type
        .mockResolvedValueOnce([diffTypeProduct]); // filler

      const result = await service.getRelatedProducts(1, 4);

      expect(result).toHaveLength(2);
      expect(result).toEqual([sameTypeProduct, diffTypeProduct]);
    });

    it('should throw NotFound when product does not exist', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(service.getRelatedProducts(999, 4)).rejects.toThrow(
        NotFoundException,
      );
    });

    it('should never include the current product or deleted/out-of-stock items', async () => {
      prisma.product.findFirst.mockResolvedValue(inStockProduct);
      prisma.product.findMany.mockResolvedValue([]);

      const result = await service.getRelatedProducts(1, 4);

      expect(result).toEqual([]);
      // inStockWhere excludes deletedAt and out-of-stock sizes
      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            id: { not: 1 },
            OR: expect.any(Array),
          }),
        }),
      );
    });
  });

  describe('findAll', () => {
    it('should filter by category (ptype)', async () => {
      prisma.product.findMany.mockResolvedValue([inStockProduct]);
      prisma.product.count.mockResolvedValue(1);

      const result = await service.findAll({ category: 'saree' });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expect.objectContaining({ ptype: 'saree' }) }),
      );
      expect(result.pagination.total).toBe(1);
    });

    it('should filter by price range', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.findAll({ minPrice: 500, maxPrice: 2000 });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              { price: { gte: 500, lte: 2000 } },
            ]),
          }),
        }),
      );
    });

    it('should apply search across name, description and ptype', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.findAll({ search: 'silk' });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            AND: expect.arrayContaining([
              {
                OR: [
                  { name: { contains: 'silk' } },
                  { description: { contains: 'silk' } },
                  { ptype: { contains: 'silk' } },
                ],
              },
            ]),
          }),
        }),
      );
    });

    it('should sort by price ascending', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.findAll({ sort: 'price_asc' });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { price: 'asc' } }),
      );
    });

    it('should sort newest first by default', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(0);

      await service.findAll({});

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { id: 'desc' } }),
      );
    });

    it('should paginate results', async () => {
      prisma.product.findMany.mockResolvedValue([]);
      prisma.product.count.mockResolvedValue(45);

      const result = await service.findAll({ page: 2, limit: 20 });

      expect(prisma.product.findMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 20 }),
      );
      expect(result.pagination).toEqual({
        page: 2,
        limit: 20,
        total: 45,
        totalPages: 3,
      });
    });
  });
});
