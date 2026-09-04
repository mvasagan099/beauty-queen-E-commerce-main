"use client";

import Link from "next/link";
import Image from "next/image";
import { useHomepageProducts } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product/product-card";
import { Product } from "@/types";
import { ProductGridSkeleton } from "@/components/ui/skeletons";
import { ShoppingBag, ArrowRight } from "lucide-react";

function Section({
  title,
  subtitle,
  products,
  href,
}: {
  title: string;
  subtitle?: string;
  products: Product[];
  href?: string;
}) {
  if (!products.length) return null;
  return (
    <section className="py-10 md:py-14" aria-labelledby={`section-${title.replace(/\s/g, "-").toLowerCase()}`}>
      <div className="flex items-end justify-between mb-6 md:mb-8">
        <div>
          <h2 id={`section-${title.replace(/\s/g, "-").toLowerCase()}`} className="section-title">
            {title}
          </h2>
          {subtitle && <p className="section-subtitle mt-1">{subtitle}</p>}
        </div>
        {href && (
          <Link href={href} className="flex-shrink-0">
            <Button variant="ghost" className="text-primary hover:text-primary/80 gap-1.5">
              View All
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
        )}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        {products.slice(0, href ? 8 : 4).map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </section>
  );
}

const categoryLinks = [
  { name: "Saree", href: "/saree", emoji: "Saree" },
  { name: "Kurthi", href: "/kurthi", emoji: "Kurthi" },
  { name: "Top", href: "/top", emoji: "Top" },
  { name: "Leggin", href: "/leggin", emoji: "Leggin" },
  { name: "Cosmetics", href: "/cosmetics", emoji: "Cosmetics" },
];

export default function HomePage() {
  const { data, isLoading, error } = useHomepageProducts();

  if (isLoading) {
    return (
      <div className="container-page py-8">
        <div className="h-[300px] md:h-[400px] bg-gradient-to-r from-primary/10 to-primary/5 rounded-2xl mb-10 animate-pulse" />
        <ProductGridSkeleton count={8} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4 px-4">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-foreground mb-2">Something went wrong</h2>
          <p className="text-sm text-muted-foreground">Failed to load products. Please try again.</p>
        </div>
        <Button onClick={() => window.location.reload()} variant="outline" className="gap-2">
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div>
      <section className="relative bg-gradient-to-br from-primary via-primary to-pink-600 text-white overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTAgMGg0MHY0MEgweiIvPjwvZz48L2c+PC9zdmc+')] opacity-30" />
        <div className="container-page py-16 md:py-24 lg:py-32 text-center relative z-10">
          <div className="max-w-3xl mx-auto">
            <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold mb-4 tracking-tight text-balance">
              Beauty Queen
            </h1>
            <p className="text-lg md:text-xl mb-8 opacity-90 text-balance">
              Your Beauty, Our Priority. Discover the finest collection of sarees, kurtis, tops, leggings, and cosmetics.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Link href="/saree">
                <Button className="bg-white text-primary hover:bg-gray-100 font-semibold px-8 py-3 text-base gap-2 shadow-lg">
                  <ShoppingBag className="h-5 w-5" />
                  Shop Now
                </Button>
              </Link>
              <Link href="/cosmetics">
                <Button variant="outline" className="border-white/40 text-white hover:bg-white/10 font-semibold px-8 py-3 text-base">
                  Explore Cosmetics
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      <div className="container-page">
        <section className="py-8 md:py-12">
          <h2 className="section-title text-center mb-6">Shop by Category</h2>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 md:gap-4">
            {categoryLinks.map((cat) => (
              <Link
                key={cat.href}
                href={cat.href}
                className="group flex flex-col items-center gap-2 p-4 md:p-6 rounded-xl border bg-card hover:shadow-md hover:border-primary/20 transition-all"
              >
                <div className="w-12 h-12 md:w-16 md:h-16 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                  <span className="text-lg md:text-xl font-bold text-primary">{cat.emoji[0]}</span>
                </div>
                <span className="text-xs md:text-sm font-medium text-foreground">{cat.name}</span>
              </Link>
            ))}
          </div>
        </section>

        {data?.newArrival && data.newArrival.length > 0 && (
          <Section
            title="New Arrivals"
            subtitle="Check out what's new in our collection"
            products={data.newArrival}
          />
        )}

        {data?.saree && data.saree.length > 0 && (
          <Section
            title="Saree"
            subtitle="Elegant sarees for every occasion"
            products={data.saree}
            href="/saree"
          />
        )}

        {data?.kurthi && data.kurthi.length > 0 && (
          <Section
            title="Kurthi"
            subtitle="Comfortable and stylish kurtis"
            products={data.kurthi}
            href="/kurthi"
          />
        )}

        {data?.top && data.top.length > 0 && (
          <Section
            title="Top"
            subtitle="Trendy tops for everyday wear"
            products={data.top}
            href="/top"
          />
        )}

        {data?.leggin && data.leggin.length > 0 && (
          <Section
            title="Leggin"
            subtitle="Comfortable leggings for all-day wear"
            products={data.leggin}
            href="/leggin"
          />
        )}

        {data?.cosmetics && data.cosmetics.length > 0 && (
          <Section
            title="Cosmetics"
            subtitle="Beauty products for your daily routine"
            products={data.cosmetics}
            href="/cosmetics"
          />
        )}

        {data?.highPrice && data.highPrice.length > 0 && (
          <Section
            title="Premium Collection"
            subtitle="Luxury picks for special occasions"
            products={data.highPrice}
          />
        )}

        {data?.lowPrice && data.lowPrice.length > 0 && (
          <Section
            title="Best Deals"
            subtitle="Great products at unbeatable prices"
            products={data.lowPrice}
          />
        )}
      </div>
    </div>
  );
}
