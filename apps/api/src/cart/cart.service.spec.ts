import { Test, TestingModule } from '@nestjs/testing';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CartService } from './cart.service';
import { PrismaService } from '../prisma/prisma.service';
import { ProductsService } from '../products/products.service';

describe('CartService', () => {
  let service: CartService;
  let prisma: {
    cartItem: {
      findMany: jest.Mock;
      findUnique: jest.Mock;
      findFirst: jest.Mock;
      create: jest.Mock;
      update: jest.Mock;
      delete: jest.Mock;
      deleteMany: jest.Mock;
    };
    product: {
      findFirst: jest.Mock;
    };
    $transaction: jest.Mock;
  };
  let productsService: {
    getAvailableSizeQty: jest.Mock;
  };

  beforeEach(async () => {
    prisma = {
      cartItem: {
        findMany: jest.fn(),
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        deleteMany: jest.fn(),
      },
      product: {
        findFirst: jest.fn(),
      },
      $transaction: jest.fn(async (cb: (tx: any) => Promise<any>) => cb(prisma)),
    };

    productsService = {
      getAvailableSizeQty: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CartService,
        { provide: PrismaService, useValue: prisma },
        { provide: ProductsService, useValue: productsService },
      ],
    }).compile();

    service = module.get<CartService>(CartService);
  });

  describe('getCart pricing regression tests', () => {
    it('never double-subtracts MRP savings from subtotal (prevents negative totals)', async () => {
      prisma.cartItem.findMany.mockResolvedValue([
        {
          id: 1,
          userId: 10,
          productId: 101,
          size: 'FREE_SIZE',
          quantity: 1,
          product: {
            id: 101,
            name: 'Kanjeevaram Silk Saree',
            price: 400,
            mrp: 1000,
            image: 'saree.webp',
            quantity: 5,
            sizeS: 0,
            sizeM: 0,
            sizeL: 0,
            sizeXl: 0,
            sizeXxl: 0,
            deletedAt: null,
          },
        },
      ]);
      productsService.getAvailableSizeQty.mockResolvedValue(5);

      const result = await service.getCart(10);

      expect(result.subtotal).toBe(400);
      expect(result.discount).toBe(600);
      // Previously buggy formula gave 400 - 600 = -200!
      expect(result.total).toBe(400);
      expect(result.itemCount).toBe(1);
      expect(result.items[0].availableStock).toBe(5);
      expect(result.items[0].availableSizes).toEqual(['FREE_SIZE']);
    });

    it('calculates multi-item cart totals and itemCount accurately', async () => {
      prisma.cartItem.findMany.mockResolvedValue([
        {
          id: 1,
          userId: 10,
          productId: 101,
          size: 'M',
          quantity: 2,
          product: {
            id: 101,
            name: 'Embroidered Kurthi',
            price: 1500,
            mrp: 2000,
            image: 'kurthi.webp',
            sizeS: 2,
            sizeM: 4,
            sizeL: 3,
            sizeXl: 0,
            sizeXxl: 0,
            quantity: 0,
            deletedAt: null,
          },
        },
        {
          id: 2,
          userId: 10,
          productId: 102,
          size: 'FREE_SIZE',
          quantity: 1,
          product: {
            id: 102,
            name: 'Velvet Matte Lipstick',
            price: 599,
            mrp: 599,
            image: 'lip.webp',
            sizeS: 0,
            sizeM: 0,
            sizeL: 0,
            sizeXl: 0,
            sizeXxl: 0,
            quantity: 12,
            deletedAt: null,
          },
        },
      ]);
      productsService.getAvailableSizeQty.mockResolvedValueOnce(4).mockResolvedValueOnce(12);

      const result = await service.getCart(10);

      expect(result.itemCount).toBe(3);
      expect(result.subtotal).toBe(3599);
      expect(result.discount).toBe(1000);
      expect(result.total).toBe(3599);
      expect(result.items[0].availableSizes).toEqual(['S', 'M', 'L']);
    });
  });

  describe('addItem', () => {
    it('supports FREE_SIZE for sarees and cosmetics', async () => {
      const saree = {
        id: 200,
        name: 'Bridal Saree',
        price: 4899,
        quantity: 6,
        deletedAt: null,
      };
      prisma.product.findFirst.mockResolvedValue(saree);
      productsService.getAvailableSizeQty.mockResolvedValue(6);
      prisma.cartItem.findUnique.mockResolvedValue(null);
      prisma.cartItem.create.mockResolvedValue({
        id: 7,
        userId: 1,
        productId: 200,
        size: 'FREE_SIZE',
        quantity: 1,
        product: saree,
      });

      const added = await service.addItem(1, {
        productId: 200,
        size: 'Free Size',
        quantity: 1,
      });

      expect(prisma.cartItem.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { userId: 1, productId: 200, size: 'FREE_SIZE', quantity: 1 },
        }),
      );
      expect(added.size).toBe('FREE_SIZE');
    });

    it('rejects invalid size names', async () => {
      prisma.product.findFirst.mockResolvedValue({ id: 1, deletedAt: null });

      await expect(
        service.addItem(1, { productId: 1, size: 'GIGANTIC', quantity: 1 }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if product missing', async () => {
      prisma.product.findFirst.mockResolvedValue(null);

      await expect(
        service.addItem(1, { productId: 999, size: 'M', quantity: 1 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateQuantity with inline size switch', () => {
    it('merges duplicate cart rows when switching to a size already in cart', async () => {
      const product = { id: 10, sizeM: 5, sizeL: 5 };
      prisma.cartItem.findFirst.mockResolvedValue({
        id: 1,
        userId: 4,
        productId: 10,
        size: 'M',
        quantity: 1,
        product,
      });
      productsService.getAvailableSizeQty.mockResolvedValue(5);
      prisma.cartItem.findUnique.mockResolvedValue({
        id: 2,
        userId: 4,
        productId: 10,
        size: 'L',
        quantity: 2,
      });
      prisma.cartItem.delete.mockResolvedValue({});
      prisma.cartItem.update.mockResolvedValue({
        id: 2,
        userId: 4,
        productId: 10,
        size: 'L',
        quantity: 3,
        product,
      });

      const updated = await service.updateQuantity(4, 1, 1, 'L');

      expect(prisma.cartItem.delete).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(prisma.cartItem.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 2 },
          data: { quantity: 3 },
        }),
      );
      expect((updated as any).quantity).toBe(3);
    });
  });
});
