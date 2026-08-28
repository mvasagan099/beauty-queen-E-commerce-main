import { api } from "@/lib/api";
import { Product, HomepageData } from "@/types";

export interface PaginatedProducts {
  success: boolean;
  products: Product[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  suggestedCategories?: string[];
}

export interface ProductListParams {
  category?: string;
  sort?: string;
  search?: string;
  page?: number;
  limit?: number;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
}

export const productService = {
  list: (params?: ProductListParams): Promise<PaginatedProducts> => {
    const searchParams = new URLSearchParams();
    if (params?.category) searchParams.set("category", params.category);
    if (params?.sort) searchParams.set("sort", params.sort);
    if (params?.search) searchParams.set("search", params.search);
    if (params?.page) searchParams.set("page", String(params.page));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.minPrice != null) searchParams.set("minPrice", String(params.minPrice));
    if (params?.maxPrice != null) searchParams.set("maxPrice", String(params.maxPrice));
    if (params?.inStock) searchParams.set("inStock", "true");
    const qs = searchParams.toString();
    return api.get(`/products${qs ? `?${qs}` : ""}`);
  },

  get: (id: number): Promise<{ product: Product; sizes: string[]; relatedProducts: Product[] }> =>
    api.get(`/products/${id}`),

  related: (id: number, limit?: number): Promise<{ relatedProducts: Product[] }> =>
    api.get(`/products/${id}/related${limit ? `?limit=${limit}` : ""}`),

  frequentlyBought: (id: number, limit?: number): Promise<{ recommendations: Product[] }> =>
    api.get(`/products/${id}/frequently-bought-together${limit ? `?limit=${limit}` : ""}`),

  homepage: (): Promise<HomepageData> => api.get("/products/homepage"),

  search: (q: string, page?: number, limit?: number, sort?: string): Promise<PaginatedProducts> => {
    const searchParams = new URLSearchParams({ q });
    if (page) searchParams.set("page", String(page));
    if (limit) searchParams.set("limit", String(limit));
    if (sort) searchParams.set("sort", sort);
    return api.get(`/products/search?${searchParams.toString()}`);
  },

  create: (formData: FormData): Promise<{ product: Product; message: string }> =>
    api.upload("/products", formData),

  update: (id: number, data: unknown): Promise<{ product: Product; message: string }> =>
    api.patch(`/products/${id}`, data),

  updateWithImages: (id: number, formData: FormData): Promise<{ product: Product; message: string }> => {
    const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
    return fetch(`${API_URL}/products/${id}`, {
      method: "PATCH",
      body: formData,
      credentials: "include",
    }).then((res) => {
      if (!res.ok) throw new Error("Update failed");
      return res.json();
    });
  },

  delete: (id: number): Promise<{ message: string }> =>
    api.delete(`/products/${id}`),

  restore: (id: number): Promise<{ message: string }> =>
    api.post(`/products/${id}/restore`),

  adminAll: (): Promise<{ products: Product[] }> =>
    api.get("/products/admin/all"),
};
