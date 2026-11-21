"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useProducts } from "@/hooks/use-products";
import { ProductGrid } from "@/components/product/product-grid";
import { Pagination } from "@/components/product/pagination";
import { ProductFilters, CatalogFilterValues } from "@/components/product/ProductFilters";
import { LoadingPage } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Suspense, useCallback } from "react";
import { Package } from "lucide-react";

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
  const minPrice = searchParams.get("minPrice") ? Number(searchParams.get("minPrice")) : undefined;
  const maxPrice = searchParams.get("maxPrice") ? Number(searchParams.get("maxPrice")) : undefined;
  const size = searchParams.get("size") || undefined;
  const inStock = searchParams.get("inStock") === "true" ? true : undefined;

  const { data, isLoading } = useProducts({
    category,
    page,
    limit: 20,
    sort: sort || undefined,
    minPrice,
    maxPrice,
    size,
    inStock,
  });

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
      const qs = params.toString();
      router.push(qs ? `/${category}?${qs}` : `/${category}`, { scroll: false });
    },
    [searchParams, router, category],
  );

  const resetFilters = useCallback(() => {
    router.push(`/${category}`, { scroll: false });
  }, [router, category]);

  const paginationParams: Record<string, string> = {};
  if (sort) paginationParams.sort = sort;
  if (minPrice != null) paginationParams.minPrice = String(minPrice);
  if (maxPrice != null) paginationParams.maxPrice = String(maxPrice);
  if (size) paginationParams.size = size;
  if (inStock) paginationParams.inStock = "true";

  return (
    <div className="page-container">
      <div className="mb-6">
        <h1 className="page-title mb-1">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      <ProductFilters
        values={{ sort, minPrice, maxPrice, size, inStock }}
        totalCount={data?.pagination?.total}
        onChange={updateFilters}
        onReset={resetFilters}
      />

      {isLoading ? (
        <LoadingPage text={`Loading ${title.toLowerCase()}...`} />
      ) : (data?.products || []).length === 0 ? (
        <EmptyState
          icon={<Package className="h-8 w-8" />}
          title="No products match your selection"
          description="Try clearing or adjusting your filters to see more pieces from this collection."
        />
      ) : (
        <>
          <ProductGrid products={data?.products || []} />
          {data?.pagination && (
            <div className="mt-8">
              <Pagination
                currentPage={data.pagination.page}
                totalPages={data.pagination.totalPages}
                baseUrl={`/${category}`}
                params={paginationParams}
              />
            </div>
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
    <Suspense fallback={<LoadingPage text={`Loading ${title.toLowerCase()}...`} />}>
      <CategoryContent
        category={category}
        title={title}
        description={description}
      />
    </Suspense>
  );
}
