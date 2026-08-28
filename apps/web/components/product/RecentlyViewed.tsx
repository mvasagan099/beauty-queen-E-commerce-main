"use client";

import { useLayoutEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { productService } from "@/services/product.service";
import { ProductCard } from "@/components/product/product-card";
import {
  getRecentlyViewed,
  clearRecentlyViewed,
} from "@/lib/recently-viewed";
import { Button } from "@/components/ui/button";

interface RecentlyViewedProps {
  limit?: number;
}

export function RecentlyViewed({ limit = 4 }: RecentlyViewedProps) {
  const [ids, setIds] = useState<number[]>([]);

  useLayoutEffect(() => {
    setIds(getRecentlyViewed().map((e) => e.productId).slice(0, limit));
  }, [limit]);

  const { data, isLoading } = useQuery({
    queryKey: ["recently-viewed", ids.join(",")],
    queryFn: async () => {
      const results = await Promise.all(ids.map((id) => productService.get(id)));
      return results.map((r) => r.product);
    },
    enabled: ids.length > 0,
  });

  const products = data || [];

  if (isLoading) {
    return (
      <div className="mt-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Recently Viewed</h2>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {Array.from({ length: limit }).map((_, i) => (
            <div key={i} className="aspect-square rounded-lg bg-gray-100 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (products.length === 0) {
    return null;
  }

  const handleClear = () => {
    clearRecentlyViewed();
    setIds([]);
  };

  return (
    <div className="mt-16">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Recently Viewed</h2>
        <Button variant="outline" size="sm" onClick={handleClear}>
          Clear
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
