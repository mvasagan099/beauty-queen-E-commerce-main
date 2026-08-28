import { Injectable, NotFoundException } from '@nestjs/common';
import { Category, CATEGORIES } from './categories.constants';

@Injectable()
export class CategoriesService {
  getAll(): Category[] {
    return CATEGORIES;
  }

  getBySlug(slug: string): Category {
    const category = CATEGORIES.find((c) => c.slug === slug);
    if (!category) {
      throw new NotFoundException(`Category '${slug}' not found`);
    }
    return category;
  }

  getSlugs(): string[] {
    return CATEGORIES.map((c) => c.slug);
  }
}