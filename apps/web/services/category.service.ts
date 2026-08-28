import { api } from "@/lib/api";

export interface Category {
  name: string;
  label: string;
  slug: string;
  description: string;
}

export const categoryService = {
  list: (): Promise<{ categories: Category[] }> =>
    api.get("/categories"),

  getBySlug: (slug: string): Promise<{ category: Category }> =>
    api.get(`/categories/${slug}`),
};
