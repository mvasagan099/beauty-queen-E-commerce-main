"use client";

import Link from "next/link";
import { useHomepageProducts } from "@/hooks/use-products";
import { Button } from "@/components/ui/button";
import { ProductCard } from "@/components/product/product-card";
import { Product } from "@/types";
import { ProductGridSkeleton } from "@/components/ui/skeletons";
import { AtelierHero } from "@/components/home/AtelierHero";
import { AtelierRunway } from "@/components/home/AtelierRunway";
import { FlashSaleBanner } from "@/components/home/FlashSaleBanner";
import { AtelierStylistStudio } from "@/components/home/AtelierStylistStudio";

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
    <section
      className="py-10 md:py-14"
      aria-labelledby={`section-${title.replace(/\s/g, "-").toLowerCase()}`}
    >
      <div className="flex items-end justify-between mb-6 md:mb-8 gap-4">
        <div>
          <h2
            id={`section-${title.replace(/\s/g, "-").toLowerCase()}`}
            className="section-title"
          >
            {title}
          </h2>
          {subtitle && <p className="section-subtitle mt-1">{subtitle}</p>}
        </div>
        {href && (
          <Link href={href} className="flex-shrink-0">
            <Button
              variant="ghost"
              className="text-primary hover:text-primary/80 font-medium"
            >
              View All
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

export default function HomePage() {
  const { data, isLoading, error } = useHomepageProducts();

  return (
    <div>
      {/* Merchandising Flash Sale Bar (renders when active) */}
      <FlashSaleBanner />

      {/* Interactive 3D Couture Hero & Collection Runway always render immediately */}
      <AtelierHero />
      <AtelierRunway />
      <AtelierStylistStudio />

      {/* Live Catalog Sections */}
      <div className="container-page">
        {isLoading && (
          <div className="py-12">
            <ProductGridSkeleton count={8} />
          </div>
        )}

        {error && !data && (
          <div className="my-12 rounded-xl border border-border bg-card p-8 text-center">
            <h2 className="font-display text-2xl font-semibold text-foreground mb-2">
              Live catalog temporarily unavailable
            </h2>
            <p className="text-sm text-muted-foreground mb-5 max-w-md mx-auto">
              Browse our curated collections above or reload to connect to the live product catalog.
            </p>
            <Button
              onClick={() => window.location.reload()}
              variant="outline"
            >
              Reload Catalog
            </Button>
          </div>
        )}

        {data?.newArrival && data.newArrival.length > 0 && (
          <Section
            title="New Arrivals"
            subtitle="Fresh weaves, silhouettes, and beauty releases from this week"
            products={data.newArrival}
          />
        )}

        {data?.saree && data.saree.length > 0 && (
          <Section
            title="Saree"
            subtitle="Kanjeevaram and festive drapes for every occasion"
            products={data.saree}
            href="/saree"
          />
        )}

        {data?.kurthi && data.kurthi.length > 0 && (
          <Section
            title="Kurthi"
            subtitle="Embroidered silk-cotton and everyday tailored kurthis"
            products={data.kurthi}
            href="/kurthi"
          />
        )}

        {data?.top && data.top.length > 0 && (
          <Section
            title="Top"
            subtitle="Draped satin blouses and effortless wardrobe tops"
            products={data.top}
            href="/top"
          />
        )}

        {data?.leggin && data.leggin.length > 0 && (
          <Section
            title="Leggin"
            subtitle="Four-way stretch modal leggings for all-day comfort"
            products={data.leggin}
            href="/leggin"
          />
        )}

        {data?.cosmetics && data.cosmetics.length > 0 && (
          <Section
            title="Cosmetics"
            subtitle="Velvet pigments and botanical glow essentials"
            products={data.cosmetics}
            href="/cosmetics"
          />
        )}

        {data?.highPrice && data.highPrice.length > 0 && (
          <Section
            title="Premium Collection"
            subtitle="Statement pieces crafted for celebrations"
            products={data.highPrice}
          />
        )}

        {data?.lowPrice && data.lowPrice.length > 0 && (
          <Section
            title="Best Deals"
            subtitle="Everyday favorites at house-direct prices"
            products={data.lowPrice}
          />
        )}
      </div>
    </div>
  );
}
