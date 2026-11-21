import { BadRequestException, ConflictException } from '@nestjs/common';
import { CategoriesService } from './categories.service';

describe('CategoriesService', () => {
  let service: CategoriesService;
  let storedValue: any;
  let prisma: {
    siteConfig: {
      findUnique: jest.Mock;
      upsert: jest.Mock;
    };
  };

  beforeEach(() => {
    storedValue = null;
    prisma = {
      siteConfig: {
        findUnique: jest.fn(async () =>
          storedValue ? { key: 'categories', value: storedValue } : null,
        ),
        upsert: jest.fn(async ({ update }: any) => {
          storedValue = update.value;
          return { key: 'categories', value: storedValue };
        }),
      },
    };
    service = new CategoriesService(prisma as any);
  });

  it('returns the 5 core categories by default', async () => {
    const list = await service.getAll();
    expect(list.map((c) => c.slug)).toEqual(['saree', 'kurthi', 'top', 'leggin', 'cosmetics']);
  });

  it('creates, updates, and deletes a custom collection', async () => {
    const created = await service.create({
      label: 'Bridal Silk Edit',
      description: 'Wedding weaves',
    });
    expect(created.slug).toBe('bridal-silk-edit');
    expect(created.isCore).toBe(false);

    const updated = await service.update('bridal-silk-edit', {
      label: 'Bridal Heritage Edit',
      active: false,
    });
    expect(updated.label).toBe('Bridal Heritage Edit');
    expect(updated.active).toBe(false);

    // Hidden from public active list, visible in admin list
    const publicList = await service.getAll(false);
    expect(publicList.some((c) => c.slug === 'bridal-silk-edit')).toBe(false);
    const adminList = await service.getAll(true);
    expect(adminList.some((c) => c.slug === 'bridal-silk-edit')).toBe(true);

    const delRes = await service.remove('bridal-silk-edit');
    expect(delRes.success).toBe(true);
  });

  it('prevents duplicate slugs and protects core categories from deletion', async () => {
    await expect(service.create({ label: 'Saree' })).rejects.toThrow(ConflictException);
    await expect(service.remove('saree')).rejects.toThrow(BadRequestException);
  });
});
