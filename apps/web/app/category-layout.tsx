"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useProducts } from "@/hooks/use-products";
import { ProductGrid } from "@/components/product/product-grid";
import { Pagination } from "@/components/product/pagination";
import { Suspense, useCallback } from "react";

const SORT_OPTIONS = [
  { value: "", label: "Default" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest First" },
];

interface CategoryPageProps {
  category: string;
  title: string;
  description: string;
}

function CategoryContent({ category, title, description }: CategoryPageProps) {
  const searchParams = useSearchParams();
  const router = useRouter();
  const page = Number(searchParams.get("page") || "1");
  const sort = searchParams.get("sort") || "";

  const { data, isLoading } = useProducts({ category, page, limit: 20, sort: sort || undefined });

  const updateSort = useCallback(
    (value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set("sort", value);
      } else {
        params.delete("sort");
      }
      params.delete("page");
      router.push(`/${category}?${params.toString()}`, { scroll: false });
    },
    [searchParams, router, category],
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">{title}</h1>
      <p className="text-gray-500 mb-8">{description}</p>

      {data?.pagination && data.pagination.total > 0 && (
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-gray-400">
            Showing {(data.pagination.page - 1) * data.pagination.limit + 1}-
            {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of{" "}
            {data.pagination.total} products
          </p>
          <select
            value={sort}
            onChange={(e) => updateSort(e.target.value)}
            className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500"
            aria-label="Sort products"
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
        </div>
      ) : (
        <>
          <ProductGrid products={data?.products || []} />
          {data?.pagination && (
            <Pagination
              currentPage={data.pagination.page}
              totalPages={data.pagination.totalPages}
              baseUrl={`/${category}`}
              params={sort ? { sort } : {}}
            />
          )}
        </>
      )}
    </div>
  );
}

export default function CategoryPage({
  category,
  title,
  description,
}: CategoryPageProps) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
        </div>
      }
    >
      <CategoryContent
        category={category}
        title={title}
        description={description}
      />
    </Suspense>
  );
}
