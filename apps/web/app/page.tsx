"use client";

import Link from "next/link";
import Image from "next/image";
import { useHomepageProducts } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product/product-card";
import { Product } from "@/types";
import { getProductImageUrl } from "@/lib/utils";

function Section({
  title,
  products,
  href,
}: {
  title: string;
  products: Product[];
  href?: string;
}) {
  if (!products.length) return null;
  return (
    <section className="py-8">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">{title}</h2>
        {href && (
          <Link href={href}>
            <Button
              variant="outline"
              className="border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white"
            >
              View All
            </Button>
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
        {products.slice(0, href ? 6 : 4).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

export default function HomePage() {
  const { data, isLoading, error } = useHomepageProducts();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex flex-col items-center gap-4">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
          <p className="text-sm text-gray-500">Loading collections...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-red-500">Failed to load products.</p>
        <Button onClick={() => window.location.reload()}>Retry</Button>
      </div>
    );
  }

  return (
    <div>
      <section className="relative bg-gradient-to-r from-pink-500 to-pink-400 text-white overflow-hidden">
        <div className="container mx-auto px-4 py-20 md:py-32 text-center relative z-10">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">Beauty Queen</h1>
          <p className="text-lg md:text-xl mb-8 opacity-90">
            Your Beauty, Our Priority
          </p>
          <Link href="/saree">
            <Button className="bg-white text-pink-500 hover:bg-gray-100 font-semibold px-8 py-3 text-lg">
              View Collection
            </Button>
          </Link>
        </div>
      </section>

      <div className="container mx-auto px-4">
        {data?.newArrival && (
          <Section title="New Arrivals" products={data.newArrival} />
        )}

        {data?.saree && data.saree.length > 0 && (
          <Section title="Saree" products={data.saree} href="/saree" />
        )}

        {data?.kurthi && data.kurthi.length > 0 && (
          <Section title="Kurthi" products={data.kurthi} href="/kurthi" />
        )}

        {data?.top && data.top.length > 0 && (
          <Section title="Top" products={data.top} href="/top" />
        )}

        {data?.leggin && data.leggin.length > 0 && (
          <Section title="Leggin" products={data.leggin} href="/leggin" />
        )}

        {data?.cosmetics && data.cosmetics.length > 0 && (
          <Section title="Cosmetics" products={data.cosmetics} href="/cosmetics" />
        )}

        {data?.highPrice && data.highPrice.length > 0 && (
          <Section title="Premium Collection" products={data.highPrice} />
        )}

        {data?.lowPrice && data.lowPrice.length > 0 && (
          <Section title="Best Deals" products={data.lowPrice} />
        )}
      </div>
    </div>
  );
}
