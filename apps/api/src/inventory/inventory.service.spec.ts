import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException, ForbiddenException } from '@nestjs/common';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: Record<string, any>;

  const mockProduct = {
    id: 1,
    name: 'Test Saree',
    price: 999,
    mrp: 1499,
    sizeS: 5,
    sizeM: 10,
    sizeL: 8,
    sizeXl: 3,
    sizeXxl: 2,
    sellerId: 1,
    deletedAt: null,
  };

  beforeEach(async () => {
    prisma = {
      product: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
  });

  describe('getStock', () => {
    it('should return stock for a product', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);

      const result = await service.getStock(1);

      expect(result).toEqual({
        productId: 1,
        name: 'Test Saree',
        sizes: { S: 5, M: 10, L: 8, XL: 3, XXL: 2 },
        totalStock: 28,
      });
    });

    it('should throw NotFoundException for non-existent product', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(service.getStock(999)).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException when seller tries to access another seller product', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);

      await expect(service.getStock(1, 2, 'SELLER')).rejects.toThrow(ForbiddenException);
    });

    it('should allow seller to access own product', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);

      const result = await service.getStock(1, 1, 'SELLER');
      expect(result.productId).toBe(1);
    });

    it('should allow admin to access any product', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);

      const result = await service.getStock(1, 99, 'ADMIN');
      expect(result.productId).toBe(1);
    });
  });

  describe('updateStock', () => {
    it('should update stock for a valid size', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.product.update.mockResolvedValue({ ...mockProduct, sizeS: 15 });

      const result = await service.updateStock(1, 'S', 15);

      expect(result.success).toBe(true);
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { sizeS: 15 },
      });
    });

    it('should throw BadRequestException for invalid size', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);

      await expect(service.updateStock(1, 'INVALID', 10)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for negative quantity', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);

      await expect(service.updateStock(1, 'S', -1)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for non-integer quantity', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);

      await expect(service.updateStock(1, 'S', 1.5)).rejects.toThrow(BadRequestException);
    });

    it('should map size aliases correctly', async () => {
      prisma.product.findFirst.mockResolvedValue(mockProduct);
      prisma.product.update.mockResolvedValue(mockProduct);

      await service.updateStock(1, 'xl', 5);
      expect(prisma.product.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { sizeXl: 5 },
      });
    });
  });

  describe('decrementStock', () => {
    it('should decrement stock when sufficient', async () => {
      const mockTx = {
        product: {
          findUnique: jest.fn().mockResolvedValue({ sizeS: 5 }),
          update: jest.fn().mockResolvedValue({}),
        },
      };
      prisma.$transaction.mockImplementation(async (fn: any) => fn(mockTx));

      const result = await service.decrementStock(1, 'S', 2);

      expect(result).toBe(true);
      expect(mockTx.product.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { sizeS: { decrement: 2 } },
      });
    });

    it('should throw BadRequestException when insufficient stock', async () => {
      const mockTx = {
        product: {
          findUnique: jest.fn().mockResolvedValue({ sizeS: 1 }),
          update: jest.fn(),
        },
      };
      prisma.$transaction.mockImplementation(async (fn: any) => fn(mockTx));

      await expect(service.decrementStock(1, 'S', 5)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for zero quantity', async () => {
      await expect(service.decrementStock(1, 'S', 0)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException for negative quantity', async () => {
      await expect(service.decrementStock(1, 'S', -1)).rejects.toThrow(BadRequestException);
    });
  });
});
