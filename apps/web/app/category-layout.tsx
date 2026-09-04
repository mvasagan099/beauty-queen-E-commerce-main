"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { useProducts } from "@/hooks/use-products";
import { ProductGrid } from "@/components/product/product-grid";
import { Pagination } from "@/components/product/pagination";
import { LoadingPage } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { Suspense, useCallback } from "react";
import { Package } from "lucide-react";

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
    <div className="page-container">
      <div className="mb-8">
        <h1 className="page-title mb-1">{title}</h1>
        <p className="text-muted-foreground">{description}</p>
      </div>

      {data?.pagination && data.pagination.total > 0 && (
        <div className="flex items-center justify-between mb-6">
          <p className="text-sm text-muted-foreground">
            Showing {(data.pagination.page - 1) * data.pagination.limit + 1}-
            {Math.min(data.pagination.page * data.pagination.limit, data.pagination.total)} of{" "}
            {data.pagination.total} products
          </p>
          <select
            value={sort}
            onChange={(e) => updateSort(e.target.value)}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
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
        <LoadingPage text={`Loading ${title.toLowerCase()}...`} />
      ) : (data?.products || []).length === 0 ? (
        <EmptyState
          icon={<Package className="h-8 w-8" />}
          title="No products found"
          description={`We couldn't find any products in this category yet. Check back soon for new arrivals!`}
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
                params={sort ? { sort } : {}}
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
