"use client";

import { useQuery } from "@tanstack/react-query";
import { productService } from "@/services/product.service";
import { ProductCard } from "@/components/product/product-card";

interface FrequentlyBoughtTogetherProps {
  productId: number;
  limit?: number;
}

export function FrequentlyBoughtTogether({
  productId,
  limit = 4,
}: FrequentlyBoughtTogetherProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["frequently-bought-together", productId, limit],
    queryFn: () => productService.frequentlyBought(productId, limit),
    enabled: !!productId,
  });

  const products = data?.recommendations || [];

  if (isLoading) {
    return (
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">
          Frequently Bought Together
        </h2>
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

  return (
    <div className="mt-16">
      <h2 className="text-2xl font-bold text-gray-900 mb-6">
        Frequently Bought Together
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}