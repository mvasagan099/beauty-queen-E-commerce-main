"use client";

import { Product } from "@/types";
import { ProductCard } from "./product-card";
import { EmptyState } from "@/components/ui/empty-state";
import { Package } from "lucide-react";

export function ProductGrid({ products }: { products: Product[] }) {
  if (!products.length) {
    return (
      <EmptyState
        icon={<Package className="h-8 w-8" />}
        title="No products found"
        description="Try adjusting your filters or check back later for new arrivals."
      />
    );
  }

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
      {products.map((product) => (
        <ProductCard key={product.id} product={product} />
      ))}
    </div>
  );
}
