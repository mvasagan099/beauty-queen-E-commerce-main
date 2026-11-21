import { BadRequestException } from '@nestjs/common';

export type CanonicalProductSize = 'S' | 'M' | 'L' | 'XL' | 'XXL' | 'FREE_SIZE';
export type PrismaStockField = 'sizeS' | 'sizeM' | 'sizeL' | 'sizeXl' | 'sizeXxl' | 'quantity';
export type DbStockColumn = 'size_s' | 'size_m' | 'size_l' | 'size_xl' | 'size_xxl' | 'quantity';

export interface ResolvedProductSize {
  canonicalSize: CanonicalProductSize;
  prismaField: PrismaStockField;
  dbColumn: DbStockColumn;
}

const SIZE_LOOKUP: Record<string, ResolvedProductSize> = {
  s: { canonicalSize: 'S', prismaField: 'sizeS', dbColumn: 'size_s' },
  small: { canonicalSize: 'S', prismaField: 'sizeS', dbColumn: 'size_s' },
  m: { canonicalSize: 'M', prismaField: 'sizeM', dbColumn: 'size_m' },
  medium: { canonicalSize: 'M', prismaField: 'sizeM', dbColumn: 'size_m' },
  l: { canonicalSize: 'L', prismaField: 'sizeL', dbColumn: 'size_l' },
  large: { canonicalSize: 'L', prismaField: 'sizeL', dbColumn: 'size_l' },
  xl: { canonicalSize: 'XL', prismaField: 'sizeXl', dbColumn: 'size_xl' },
  xxl: { canonicalSize: 'XXL', prismaField: 'sizeXxl', dbColumn: 'size_xxl' },
  free_size: { canonicalSize: 'FREE_SIZE', prismaField: 'quantity', dbColumn: 'quantity' },
  'free size': { canonicalSize: 'FREE_SIZE', prismaField: 'quantity', dbColumn: 'quantity' },
  freesize: { canonicalSize: 'FREE_SIZE', prismaField: 'quantity', dbColumn: 'quantity' },
  one_size: { canonicalSize: 'FREE_SIZE', prismaField: 'quantity', dbColumn: 'quantity' },
  'one size': { canonicalSize: 'FREE_SIZE', prismaField: 'quantity', dbColumn: 'quantity' },
  onesize: { canonicalSize: 'FREE_SIZE', prismaField: 'quantity', dbColumn: 'quantity' },
  standard: { canonicalSize: 'FREE_SIZE', prismaField: 'quantity', dbColumn: 'quantity' },
};

export const VALID_SIZE_LABELS = ['S', 'M', 'L', 'XL', 'XXL', 'FREE_SIZE'] as const;

export function tryResolveProductSize(size: string | null | undefined): ResolvedProductSize | null {
  if (!size || typeof size !== 'string') return null;
  const normalized = size.trim().toLowerCase().replace(/-/g, '_');
  return SIZE_LOOKUP[normalized] ?? null;
}

export function resolveProductSize(size: string | null | undefined): ResolvedProductSize {
  const resolved = tryResolveProductSize(size);
  if (!resolved) {
    throw new BadRequestException(
      `Invalid size: ${size}. Valid sizes: ${VALID_SIZE_LABELS.join(', ')}`,
    );
  }
  return resolved;
}

export function getAvailableSizesForProduct(product: {
  sizeS?: number | null;
  sizeM?: number | null;
  sizeL?: number | null;
  sizeXl?: number | null;
  sizeXxl?: number | null;
  quantity?: number | null;
}): { size: CanonicalProductSize; stock: number }[] {
  const candidates: { size: CanonicalProductSize; stock: number }[] = [
    { size: 'S', stock: product.sizeS ?? 0 },
    { size: 'M', stock: product.sizeM ?? 0 },
    { size: 'L', stock: product.sizeL ?? 0 },
    { size: 'XL', stock: product.sizeXl ?? 0 },
    { size: 'XXL', stock: product.sizeXxl ?? 0 },
  ];
  const sizedEntries = candidates.filter((entry) => entry.stock > 0);

  if (sizedEntries.length > 0) {
    return sizedEntries;
  }

  const freeStock = product.quantity ?? 0;
  if (freeStock > 0) {
    return [{ size: 'FREE_SIZE', stock: freeStock }];
  }

  return [];
}
