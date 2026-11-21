"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useProducts, useSearchProducts } from "@/hooks/use-products";
import { ProductGrid } from "@/components/product/product-grid";
import { Pagination } from "@/components/product/pagination";
import { ProductFilters, CatalogFilterValues } from "@/components/product/ProductFilters";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingPage } from "@/components/ui/spinner";
import { Suspense, useCallback } from "react";
import { Search } from "lucide-react";

const SEARCH_SORT_OPTIONS = [
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
  const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
  const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;
  const size = searchParams.get("size") || undefined;
  const inStock = searchParams.get("inStock") === "true" ? true : undefined;

  const hasFacetFilters =
    minPrice != null || maxPrice != null || Boolean(size) || Boolean(inStock);

  const rankedQuery = useSearchProducts(hasFacetFilters ? "" : q, {
    page,
    limit: 20,
    sort: sort || undefined,
  });

  const filteredQuery = useProducts(
    hasFacetFilters && q.trim().length >= 2
      ? {
          search: q,
          page,
          limit: 20,
          sort: sort || undefined,
          minPrice,
          maxPrice,
          size,
          inStock,
        }
      : undefined,
  );

  const activeQuery = hasFacetFilters && q.trim().length >= 2 ? filteredQuery : rankedQuery;
  const { data, isLoading, error } = activeQuery;

  const products = data?.products || [];
  const pagination = data?.pagination;
  const suggestedCategories = data?.suggestedCategories || [];

  const categoryLabel: Record<string, string> = {
    saree: "Sarees",
    kurthi: "Kurthis",
    top: "Tops",
    leggin: "Leggings",
    cosmetics: "Cosmetics",
  };

  const updateFilters = useCallback(
    (patch: Partial<CatalogFilterValues>) => {
      const params = new URLSearchParams(searchParams.toString());
      const setOrDelete = (key: string, val: string | number | boolean | undefined) => {
        if (val === undefined || val === "" || val === false) {
          params.delete(key);
        } else {
          params.set(key, String(val));
        }
      };

      if ("sort" in patch) setOrDelete("sort", patch.sort);
      if ("minPrice" in patch) setOrDelete("minPrice", patch.minPrice);
      if ("maxPrice" in patch) setOrDelete("maxPrice", patch.maxPrice);
      if ("size" in patch) setOrDelete("size", patch.size);
      if ("inStock" in patch) setOrDelete("inStock", patch.inStock);

      params.delete("page");
      router.push(`/search?${params.toString()}`, { scroll: false });
    },
    [searchParams, router],
  );

  const resetFilters = useCallback(() => {
    router.push(q ? `/search?q=${encodeURIComponent(q)}` : "/search", { scroll: false });
  }, [router, q]);

  const paginationParams: Record<string, string> = { q };
  if (sort) paginationParams.sort = sort;
  if (minPrice != null) paginationParams.minPrice = String(minPrice);
  if (maxPrice != null) paginationParams.maxPrice = String(maxPrice);
  if (size) paginationParams.size = size;
  if (inStock) paginationParams.inStock = "true";

  return (
    <div className="page-container">
      <h1 className="page-title mb-2">Search Results</h1>

      {q && (
        <p className="text-muted-foreground mb-6">
          Showing results for &ldquo;<span className="font-medium text-foreground">{q}</span>&rdquo;
          {pagination && pagination.total > 0 && (
            <span>
              {" "}— {pagination.total} product{pagination.total !== 1 ? "s" : ""} found
            </span>
          )}
        </p>
      )}

      {!q && (
        <EmptyState
          icon={<Search className="h-8 w-8" />}
          title="Enter a search term"
          description="Type something in the search bar to find products."
        />
      )}

      {q && (
        <ProductFilters
          values={{ sort, minPrice, maxPrice, size, inStock }}
          totalCount={pagination?.total}
          sortOptions={SEARCH_SORT_OPTIONS}
          onChange={updateFilters}
          onReset={resetFilters}
        />
      )}

      {error && (
        <EmptyState
          title="Something went wrong"
          description="We couldn't complete your search. Please try again."
          action={
            <button onClick={() => window.location.reload()} className="btn-primary">
              Try Again
            </button>
          }
        />
      )}

      {isLoading && q && <LoadingPage text="Searching products..." />}

      {!isLoading && !error && q && products.length > 0 && (
        <>
          <ProductGrid products={products} />

          {pagination && pagination.totalPages > 1 && (
            <div className="mt-8">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                baseUrl="/search"
                params={paginationParams}
              />
            </div>
          )}
        </>
      )}

      {!isLoading && q && products.length === 0 && !error && (
        <EmptyState
          icon={<Search className="h-8 w-8" />}
          title={`No results for "${q}"`}
          description={
            hasFacetFilters
              ? "Try clearing your active price or size filters to broaden the search."
              : "Try a different search term or browse our categories."
          }
          action={
            suggestedCategories.length > 0 ? (
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm font-medium text-muted-foreground">
                  These categories might have what you&apos;re looking for:
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  {suggestedCategories.map((slug) => (
                    <a
                      key={slug}
                      href={`/${slug}`}
                      className="rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-sm font-medium text-primary hover:bg-primary/10 transition-colors"
                    >
                      {categoryLabel[slug] || slug}
                    </a>
                  ))}
                </div>
              </div>
            ) : undefined
          }
        />
      )}
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<LoadingPage text="Loading search..." />}>
      <SearchResults />
    </Suspense>
  );
}
