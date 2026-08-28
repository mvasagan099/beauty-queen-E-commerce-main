import { Test, TestingModule } from '@nestjs/testing';
import { Reflector } from '@nestjs/core';
import { ForbiddenException } from '@nestjs/common';
import { OwnershipGuard, CheckOwnership } from './ownership.guard';
import { PrismaService } from '../../prisma/prisma.service';

class ProductOwner {
  access() {}
}
class OrderOwner {
  access() {}
}

// Apply the ownership decorator to the methods so metadata is set where the
// guard reads it (handler level).
CheckOwnership('product', 'id')(ProductOwner.prototype, 'access', Object.getOwnPropertyDescriptor(ProductOwner.prototype, 'access'));
CheckOwnership('order', 'id')(OrderOwner.prototype, 'access', Object.getOwnPropertyDescriptor(OrderOwner.prototype, 'access'));

const productHandler = Object.getOwnPropertyDescriptor(ProductOwner.prototype, 'access')!.value;
const orderHandler = Object.getOwnPropertyDescriptor(OrderOwner.prototype, 'access')!.value;

function makeContext(params: Record<string, string>, user: any, handler: any, cls: any) {
  return {
    getHandler: () => handler,
    getClass: () => cls,
    switchToHttp: () => ({ getRequest: () => ({ params, user }) }),
  } as any;
}

describe('OwnershipGuard - IDOR protection (horizontal escalation)', () => {
  let guard: OwnershipGuard;
  let prisma: Record<string, any>;

  beforeEach(async () => {
    prisma = {
      product: { findUnique: jest.fn() },
      order: { findUnique: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OwnershipGuard,
        { provide: Reflector, useValue: new Reflector() },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    guard = module.get<OwnershipGuard>(OwnershipGuard);
  });

  it('rejects a seller accessing another seller product (IDOR)', async () => {
    prisma.product.findUnique.mockResolvedValue({ sellerId: 1 });
    const ctx = makeContext({ id: '10' }, { sub: 2, role: 'SELLER' }, productHandler, ProductOwner);
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('allows a seller accessing their own product', async () => {
    prisma.product.findUnique.mockResolvedValue({ sellerId: 1 });
    const ctx = makeContext({ id: '10' }, { sub: 1, role: 'SELLER' }, productHandler, ProductOwner);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
  });

  it('rejects a seller accessing another seller order (IDOR)', async () => {
    prisma.order.findUnique.mockResolvedValue({ sellerId: 5 });
    const ctx = makeContext({ id: '99' }, { sub: 6, role: 'SELLER' }, orderHandler, OrderOwner);
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });

  it('lets ADMIN bypass ownership checks', async () => {
    prisma.product.findUnique.mockResolvedValue({ sellerId: 1 });
    const ctx = makeContext({ id: '10' }, { sub: 1, role: 'ADMIN' }, productHandler, ProductOwner);
    await expect(guard.canActivate(ctx)).resolves.toBe(true);
    expect(prisma.product.findUnique).not.toHaveBeenCalled();
  });

  it('rejects a non-numeric resource id', async () => {
    const ctx = makeContext({ id: 'abc' }, { sub: 1, role: 'SELLER' }, productHandler, ProductOwner);
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
    expect(prisma.product.findUnique).not.toHaveBeenCalled();
  });

  it('rejects when the resource does not exist (avoids ID enumeration)', async () => {
    prisma.product.findUnique.mockResolvedValue(null);
    const ctx = makeContext({ id: '404ish' }, { sub: 1, role: 'SELLER' }, productHandler, ProductOwner);
    await expect(guard.canActivate(ctx)).rejects.toThrow(ForbiddenException);
  });
});
