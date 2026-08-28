import { Test, TestingModule } from '@nestjs/testing';
import { AlertsService } from './alerts.service';
import { PrismaService } from '../prisma/prisma.service';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { StockAlertStatus, PriceAlertStatus } from '@prisma/client';

describe('AlertsService', () => {
  let service: AlertsService;
  let prisma: Record<string, any>;

  const seatedProduct = {
    id: 1,
    name: 'Silk Saree',
    price: 1200,
    mrp: 2000,
    image: 'x.jpg',
    quantity: 0,
    sizeS: 5,
    sizeM: 0,
    sizeL: 0,
    sizeXl: 0,
    sizeXxl: 0,
  };

  const outOfStockProduct = {
    id: 2,
    name: 'Kurthi',
    price: 800,
    mrp: 1200,
    image: 'y.jpg',
    quantity: 0,
    sizeS: 0,
    sizeM: 0,
    sizeL: 0,
    sizeXl: 0,
    sizeXxl: 0,
  };

  beforeEach(async () => {
    prisma = {
      stockAlert: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      priceAlert: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
      product: {
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [AlertsService, { provide: PrismaService, useValue: prisma }],
    }).compile();

    service = module.get<AlertsService>(AlertsService);
  });

  describe('hasStock', () => {
    it('should report stock when a size column is positive', () => {
      expect(service.hasStock(seatedProduct as any)).toBe(true);
    });

    it('should report out of stock when every column is zero', () => {
      expect(service.hasStock(outOfStockProduct as any)).toBe(false);
    });

    it('should treat undefined size columns as zero but still honor quantity', () => {
      expect(service.hasStock({ quantity: 3 } as any)).toBe(true);
      expect(service.hasStock({ quantity: null } as any)).toBe(false);
    });
  });

  describe('createStockAlert', () => {
    it('should throw NotFound when the product does not exist', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(service.createStockAlert(1, 999, 'a@b.c')).rejects.toThrow(NotFoundException);
    });

    it('should reject creating alert for an in-stock product', async () => {
      prisma.product.findFirst.mockResolvedValue(seatedProduct);
      await expect(service.createStockAlert(1, 1, 'a@b.c')).rejects.toThrow(BadRequestException);
      expect(prisma.stockAlert.create).not.toHaveBeenCalled();
    });

    it('should create an alert for an out-of-stock product', async () => {
      prisma.product.findFirst.mockResolvedValue(outOfStockProduct);
      prisma.stockAlert.findUnique.mockResolvedValue(null);
      prisma.stockAlert.create.mockResolvedValue({ id: 10, userId: 1, productId: 2, status: 'WAITING' });

      const result = await service.createStockAlert(1, 2, 'a@b.c', 'M');

      expect(prisma.stockAlert.create).toHaveBeenCalledWith({
        data: { userId: 1, productId: 2, email: 'a@b.c', size: 'M' },
      });
      expect(result.success).toBe(true);
    });

    it('should restore a cancelled alert instead of creating a duplicate', async () => {
      prisma.product.findFirst.mockResolvedValue(outOfStockProduct);
      prisma.stockAlert.findUnique.mockResolvedValue({
        id: 10,
        status: StockAlertStatus.CANCELLED,
      });
      prisma.stockAlert.update.mockResolvedValue({ id: 10, status: StockAlertStatus.WAITING });

      await service.createStockAlert(1, 2, 'a@b.c');

      expect(prisma.stockAlert.create).not.toHaveBeenCalled();
      expect(prisma.stockAlert.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { status: StockAlertStatus.WAITING, size: null, notifiedAt: null },
      });
    });
  });

  describe('cancelStockAlert', () => {
    it('should throw NotFound when no alert exists', async () => {
      prisma.stockAlert.findUnique.mockResolvedValue(null);
      await expect(service.cancelStockAlert(1, 2)).rejects.toThrow(NotFoundException);
    });

    it('should mark a waiting alert cancelled', async () => {
      prisma.stockAlert.findUnique.mockResolvedValue({ id: 10, status: StockAlertStatus.WAITING });
      prisma.stockAlert.update.mockResolvedValue({ id: 10, status: StockAlertStatus.CANCELLED });

      const result = await service.cancelStockAlert(1, 2);

      expect(prisma.stockAlert.update).toHaveBeenCalledWith({
        where: { id: 10 },
        data: { status: StockAlertStatus.CANCELLED },
      });
      expect(result.message).toContain('cancelled');
    });

    it('should no-op when already triggered', async () => {
      prisma.stockAlert.findUnique.mockResolvedValue({ id: 10, status: StockAlertStatus.TRIGGERED });
      const result = await service.cancelStockAlert(1, 2);
      expect(prisma.stockAlert.update).not.toHaveBeenCalled();
      expect(result.message).toContain('fulfilled');
    });
  });

  describe('createPriceAlert', () => {
    it('should throw NotFound when the product does not exist', async () => {
      prisma.product.findFirst.mockResolvedValue(null);
      await expect(service.createPriceAlert(1, 999, 500)).rejects.toThrow(NotFoundException);
    });

    it('should create a price alert with the watched price', async () => {
      prisma.product.findFirst.mockResolvedValue(seatedProduct);
      prisma.priceAlert.findUnique.mockResolvedValue(null);
      prisma.priceAlert.create.mockResolvedValue({ id: 20, userId: 1, productId: 1, watchedPrice: 500 });

      const result = await service.createPriceAlert(1, 1, 500);

      expect(prisma.priceAlert.create).toHaveBeenCalledWith({
        data: { userId: 1, productId: 1, watchedPrice: 500 },
      });
      expect(result.message).toContain('₹500');
    });
  });

  describe('cancelPriceAlert', () => {
    it('should throw NotFound when no alert exists', async () => {
      prisma.priceAlert.findUnique.mockResolvedValue(null);
      await expect(service.cancelPriceAlert(1, 1)).rejects.toThrow(NotFoundException);
    });

    it('should mark a watching alert cancelled', async () => {
      prisma.priceAlert.findUnique.mockResolvedValue({ id: 20, status: PriceAlertStatus.WATCHING });
      prisma.priceAlert.update.mockResolvedValue({ id: 20, status: PriceAlertStatus.CANCELLED });

      const result = await service.cancelPriceAlert(1, 1);

      expect(prisma.priceAlert.update).toHaveBeenCalledWith({
        where: { id: 20 },
        data: { status: PriceAlertStatus.CANCELLED },
      });
      expect(result.message).toContain('cancelled');
    });
  });

  describe('listMyAlerts', () => {
    it('should map alerts with the product summary', async () => {
      prisma.stockAlert.findMany.mockResolvedValue([
        { id: 1, productId: 2, product: outOfStockProduct, size: 'M', status: 'WAITING', notifiedAt: null, createdAt: new Date() },
      ]);
      prisma.priceAlert.findMany.mockResolvedValue([]);

      const result = await service.listMyAlerts(1);

      expect(result.stockAlerts).toHaveLength(1);
      expect(result.stockAlerts[0]).toEqual(
        expect.objectContaining({
          product: expect.objectContaining({ id: 2, name: 'Kurthi' }),
          size: 'M',
        }),
      );
      expect(result.priceAlerts).toEqual([]);
    });
  });
});