"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useSearchProducts } from "@/hooks/use-products";
import { ProductGrid } from "@/components/product/product-grid";
import { Pagination } from "@/components/product/pagination";
import { Suspense, useCallback } from "react";

const SORT_OPTIONS = [
  { value: "", label: "Relevance" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "newest", label: "Newest First" },
];

function SearchResults() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const q = searchParams.get("q") || "";
  const page = Number(searchParams.get("page") || "1");
  const sort = searchParams.get("sort") || "";

  const { data, isLoading, error } = useSearchProducts(q, { page, limit: 20, sort: sort || undefined });

  const products = data?.products || [];
  const pagination = data?.pagination;
  const suggestedCategories = data?.suggestedCategories || [];

  const categoryLabel: Record<string, string> = {
    saree: "Sarees",
    kurthi: "Kurthis",
    top: "Tops",
    leggin: "Leggins",
    cosmetics: "Cosmetics",
  };

  const updateParam = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      if (key !== "page") {
        params.delete("page");
      }
      router.push(`/search?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-2">Search Results</h1>

      {q && (
        <p className="text-gray-500 mb-6">
          Showing results for &ldquo;{q}&rdquo;
          {pagination && pagination.total > 0 && (
            <span>
              {" "}
              &mdash; {pagination.total} product{pagination.total !== 1 ? "s" : ""} found
            </span>
          )}
        </p>
      )}

      {!q && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <p className="text-gray-400 text-lg">Enter a search term to find products.</p>
        </div>
      )}

      {error && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
          <p className="text-red-500">Something went wrong. Please try again.</p>
        </div>
      )}

      {isLoading && q && (
        <div className="flex items-center justify-center min-h-[40vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
        </div>
      )}

      {!isLoading && !error && q && products.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm text-gray-500">
              Page {pagination?.page || 1} of {pagination?.totalPages || 1}
            </span>
            <select
              value={sort}
              onChange={(e) => updateParam("sort", e.target.value)}
              className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500"
              aria-label="Sort search results"
            >
              {SORT_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <ProductGrid products={products} />

          {pagination && pagination.totalPages > 1 && (
            <Pagination
              currentPage={pagination.page}
              totalPages={pagination.totalPages}
              baseUrl="/search"
              params={{
                q,
                ...(sort ? { sort } : {}),
              }}
            />
          )}
        </>
      )}

      {!isLoading && q && products.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center min-h-[40vh] gap-6">
          <p className="text-gray-500 text-lg">No products found for &ldquo;{q}&rdquo;</p>
          <p className="text-gray-400 text-sm">Try a different search term.</p>

          {suggestedCategories.length > 0 && (
            <div className="flex flex-col items-center gap-3">
              <p className="text-sm font-medium text-gray-600">
                These categories might have what you&rsquo;re looking for:
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                {suggestedCategories.map((slug) => (
                  <a
                    key={slug}
                    href={`/${slug}`}
                    className="rounded-full border border-pink-200 bg-pink-50 px-4 py-1.5 text-sm text-pink-700 hover:bg-pink-100"
                  >
                    {categoryLabel[slug] || slug}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-[60vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
        </div>
      }
    >
      <SearchResults />
    </Suspense>
  );
}
