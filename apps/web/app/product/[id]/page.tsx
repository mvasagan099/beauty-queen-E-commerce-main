import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Product } from "@/types";
import { API_BASE } from "@/lib/utils";
import ProductDetailView from "./product-detail-view";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface PageProps {
  params: Promise<{ id: string }>;
}

async function getProduct(id: number): Promise<{
  product: Product;
  sizes: string[];
  relatedProducts: {
    id: number;
    name: string | null;
    price: number;
    mrp: number | null;
    image: string | null;
    ptype: string | null;
  }[];
} | null> {
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${API_URL}/products/${id}`, {
      cache: "no-store",
      signal: controller.signal,
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const json = await res.json();
    if (!json?.product) return null;
    return json;
  } catch {
    return null;
  }
}

function productImageUrl(image?: string | null): string | null {
  if (!image) return null;
  if (/^https?:\/\//.test(image)) return image;
  return `${API_BASE}/${image}`;
}

function availableSizes(p: Product): string[] {
  const map: [string, keyof Product][] = [
    ["S", "sizeS"],
    ["M", "sizeM"],
    ["L", "sizeL"],
    ["XL", "sizeXl"],
    ["XXL", "sizeXxl"],
  ];
  return map
    .filter(([, key]) => {
      const val = p[key] as number | null;
      return val != null && val > 0;
    })
    .map(([label]) => label);
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const data = await getProduct(Number(id));

  if (!data?.product) {
    return { title: "Product Not Found" };
  }

  const p = data.product;
  const image = productImageUrl(p.image);
  const title = p.name || "Product";
  const description = p.description || `Buy ${title} online. Price ₹${p.price ?? 0}`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url: `${process.env.FRONTEND_URL || "http://localhost:3000"}/product/${id}`,
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  };
}

export default async function ProductDetailPage({ params }: PageProps) {
  const { id } = await params;
  const data = await getProduct(Number(id));

  if (!data?.product) {
    notFound();
  }

  const p = data.product;
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name || "",
    description: p.description || "",
    image:
      productImageUrl(p.image) ??
      "https://placehold.co/600x800/fce7f3/ec4899?text=No+Image",
    offers: {
      "@type": "Offer",
      price: p.price || 0,
      priceCurrency: "INR",
      availability:
        availableSizes(p).length > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <ProductDetailView productId={Number(id)} initialData={data} />
    </>
  );
}
