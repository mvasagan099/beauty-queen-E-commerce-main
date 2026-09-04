"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useSearchProducts } from "@/hooks/use-products";
import { ProductGrid } from "@/components/product/product-grid";
import { Pagination } from "@/components/product/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { LoadingPage } from "@/components/ui/spinner";
import { Suspense, useCallback } from "react";
import { Search } from "lucide-react";

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
    leggin: "Leggings",
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
    <div className="page-container">
      <h1 className="page-title">Search Results</h1>

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
          <div className="flex items-center justify-between mb-6">
            <span className="text-sm text-muted-foreground">
              Page {pagination?.page || 1} of {pagination?.totalPages || 1}
            </span>
            <select
              value={sort}
              onChange={(e) => updateParam("sort", e.target.value)}
              className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
            <div className="mt-8">
              <Pagination
                currentPage={pagination.page}
                totalPages={pagination.totalPages}
                baseUrl="/search"
                params={{
                  q,
                  ...(sort ? { sort } : {}),
                }}
              />
            </div>
          )}
        </>
      )}

      {!isLoading && q && products.length === 0 && !error && (
        <EmptyState
          icon={<Search className="h-8 w-8" />}
          title={`No results for "${q}"`}
          description="Try a different search term or browse our categories."
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
    <Suspense
      fallback={<LoadingPage text="Loading search..." />}
    >
      <SearchResults />
    </Suspense>
  );
}
