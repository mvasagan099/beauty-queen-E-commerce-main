"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { productService } from "@/services/product.service";
import { ProductCard } from "@/components/product/product-card";

interface RelatedProductsProps {
  productId: number;
  title?: string;
  limit?: number;
}

export function RelatedProducts({
  productId,
  title = "You May Also Like",
  limit = 4,
}: RelatedProductsProps) {
  const { data, isLoading } = useQuery({
    queryKey: ["related-products", productId, limit],
    queryFn: () => productService.related(productId, limit),
    enabled: !!productId,
  });

  const products = data?.relatedProducts || [];

  if (isLoading) {
    return (
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2>
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
      <h2 className="text-2xl font-bold text-gray-900 mb-6">{title}</h2>
      {products.length > 4 && (
        <Link
          href="/search"
          className="inline-block mb-2 text-sm text-pink-500 hover:text-pink-600"
        >
          View all products
        </Link>
      )}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
