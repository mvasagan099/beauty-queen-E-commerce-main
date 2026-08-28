import { useQuery } from "@tanstack/react-query";
import { productService, ProductListParams } from "@/services/product.service";
import { categoryService } from "@/services/category.service";

export function useProducts(params?: ProductListParams) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: () => productService.list(params),
  });
}

export function useProduct(id: number) {
  return useQuery({
    queryKey: ["product", id],
    queryFn: () => productService.get(id),
    enabled: !!id,
  });
}

export function useHomepageProducts() {
  return useQuery({
    queryKey: ["homepage"],
    queryFn: () => productService.homepage(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useSearchProducts(
  query: string,
  options?: { page?: number; limit?: number; sort?: string }
) {
  return useQuery({
    queryKey: ["search", query, options?.page, options?.limit, options?.sort],
    queryFn: () => productService.search(query, options?.page, options?.limit, options?.sort),
    enabled: !!query && query.trim().length >= 2,
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: () => categoryService.list(),
    staleTime: 5 * 60 * 1000,
  });
}

export function useCategory(slug: string) {
  return useQuery({
    queryKey: ["category", slug],
    queryFn: () => categoryService.getBySlug(slug),
    enabled: !!slug,
  });
}

export function useSellerProducts() {
  return useQuery({
    queryKey: ["seller-products"],
    queryFn: () => productService.adminAll(),
  });
}
