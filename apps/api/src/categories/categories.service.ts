import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Category, CATEGORIES } from './categories.constants';

export interface ManagedCategory extends Category {
  isCore?: boolean;
  active?: boolean;
  sortOrder?: number;
}

const SITE_CONFIG_KEY = 'categories';
const CORE_SLUGS = new Set(CATEGORIES.map((c) => c.slug));

@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(private readonly prisma: PrismaService) {}

  private normalizeSlug(raw: string): string {
    return raw
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  private async loadStoredOverrides(): Promise<ManagedCategory[]> {
    try {
      const cfg = await this.prisma.siteConfig.findUnique({
        where: { key: SITE_CONFIG_KEY },
      });
      if (cfg && Array.isArray(cfg.value)) {
        return cfg.value as unknown as ManagedCategory[];
      }
    } catch {
      // Fallback cleanly to core categories if DB unavailable during tests
    }
    return [];
  }

  private async saveStoredOverrides(categories: ManagedCategory[]): Promise<void> {
    await this.prisma.siteConfig.upsert({
      where: { key: SITE_CONFIG_KEY },
      update: { value: categories as any },
      create: { key: SITE_CONFIG_KEY, value: categories as any },
    });
  }

  async getAll(includeInactive = false): Promise<ManagedCategory[]> {
    const overrides = await this.loadStoredOverrides();
    const overrideMap = new Map(overrides.map((c) => [c.slug, c]));

    const merged: ManagedCategory[] = CATEGORIES.map((core, idx) => {
      const ov = overrideMap.get(core.slug);
      return {
        ...core,
        ...(ov ? { label: ov.label || core.label, description: ov.description ?? core.description, active: ov.active ?? true, sortOrder: ov.sortOrder ?? idx } : { active: true, sortOrder: idx }),
        isCore: true,
      };
    });

    for (const custom of overrides) {
      if (!CORE_SLUGS.has(custom.slug)) {
        merged.push({
          name: custom.name || custom.slug,
          label: custom.label,
          slug: custom.slug,
          description: custom.description || '',
          isCore: false,
          active: custom.active ?? true,
          sortOrder: custom.sortOrder ?? merged.length,
        });
      }
    }

    merged.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

    return includeInactive ? merged : merged.filter((c) => c.active !== false);
  }

  async getBySlug(slug: string): Promise<ManagedCategory> {
    const all = await this.getAll(true);
    const category = all.find((c) => c.slug === slug);
    if (!category) {
      throw new NotFoundException(`Category '${slug}' not found`);
    }
    return category;
  }

  async getSlugs(): Promise<string[]> {
    const all = await this.getAll(false);
    return all.map((c) => c.slug);
  }

  async create(input: {
    label: string;
    slug?: string;
    description?: string;
    active?: boolean;
  }): Promise<ManagedCategory> {
    const label = (input.label || '').trim();
    if (!label) {
      throw new BadRequestException('Category label is required');
    }

    const slug = this.normalizeSlug(input.slug || label);
    if (!slug || slug.length > 50) {
      throw new BadRequestException('Valid category slug is required (1–50 characters)');
    }

    const existingAll = await this.getAll(true);
    if (existingAll.some((c) => c.slug === slug)) {
      throw new ConflictException(`Category '${slug}' already exists`);
    }

    const overrides = await this.loadStoredOverrides();
    const created: ManagedCategory = {
      name: slug,
      label,
      slug,
      description: (input.description || '').trim(),
      isCore: false,
      active: input.active ?? true,
      sortOrder: existingAll.length,
    };

    overrides.push(created);
    await this.saveStoredOverrides(overrides);
    this.logger.log(`Created custom category '${slug}'`);
    return created;
  }

  async update(
    slug: string,
    patch: { label?: string; description?: string; active?: boolean; sortOrder?: number },
  ): Promise<ManagedCategory> {
    const existing = await this.getBySlug(slug);
    const overrides = await this.loadStoredOverrides();
    const idx = overrides.findIndex((c) => c.slug === slug);

    const updated: ManagedCategory = {
      ...existing,
      label: patch.label !== undefined ? patch.label.trim() || existing.label : existing.label,
      description:
        patch.description !== undefined ? patch.description.trim() : existing.description,
      active:
        CORE_SLUGS.has(slug)
          ? true
          : patch.active !== undefined
          ? Boolean(patch.active)
          : existing.active ?? true,
      sortOrder:
        patch.sortOrder !== undefined && Number.isFinite(patch.sortOrder)
          ? Math.floor(patch.sortOrder)
          : existing.sortOrder,
      isCore: CORE_SLUGS.has(slug),
    };

    if (idx >= 0) {
      overrides[idx] = updated;
    } else {
      overrides.push(updated);
    }

    await this.saveStoredOverrides(overrides);
    this.logger.log(`Updated category '${slug}'`);
    return updated;
  }

  async remove(slug: string): Promise<{ success: boolean; message: string }> {
    if (CORE_SLUGS.has(slug)) {
      throw new BadRequestException(`Core category '${slug}' cannot be deleted`);
    }

    const overrides = await this.loadStoredOverrides();
    const next = overrides.filter((c) => c.slug !== slug);
    if (next.length === overrides.length) {
      throw new NotFoundException(`Category '${slug}' not found`);
    }

    await this.saveStoredOverrides(next);
    this.logger.log(`Deleted custom category '${slug}'`);
    return { success: true, message: `Category '${slug}' deleted` };
  }
}