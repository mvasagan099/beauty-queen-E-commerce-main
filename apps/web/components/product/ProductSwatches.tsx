"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

export interface ProductSwatch {
  id: string;
  name: string;
  hex: string;
  image?: string | null;
  inStock?: boolean;
}

interface ProductSwatchesProps {
  productId: number;
  category?: string | null;
  selectedSwatch: ProductSwatch | null;
  onSelect: (swatch: ProductSwatch) => void;
}

export function ProductSwatches({
  productId,
  category,
  selectedSwatch,
  onSelect,
}: ProductSwatchesProps) {
  const { data } = useQuery<{ success: boolean; swatches: ProductSwatch[] }>({
    queryKey: ["product-swatches", productId, category],
    queryFn: () =>
      api.get(
        `/growth/products/${productId}/swatches${
          category ? `?category=${encodeURIComponent(category)}` : ""
        }`
      ),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const swatches = data?.swatches || [];
  if (swatches.length === 0) return null;

  const active = selectedSwatch || swatches[0];
  const isCosmetics = (category || "").toLowerCase().includes("cosmetic");

  return (
    <div>
      <div className="flex items-center justify-between mb-2.5">
        <span className="text-sm font-semibold text-foreground">
          {isCosmetics ? "Shade" : "Colorway"}:{" "}
          <span className="font-normal text-muted-foreground">{active.name}</span>
        </span>
      </div>
      <div className="flex flex-wrap gap-2.5" role="radiogroup" aria-label={isCosmetics ? "Select shade" : "Select color"}>
        {swatches.map((swatch) => {
          const isSelected = active.id === swatch.id;
          return (
            <button
              key={swatch.id}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={swatch.name}
              disabled={swatch.inStock === false}
              onClick={() => onSelect(swatch)}
              className={`group flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                isSelected
                  ? "border-primary bg-primary/5 text-foreground shadow-sm"
                  : "border-border hover:border-primary/40 text-muted-foreground hover:text-foreground"
              } ${swatch.inStock === false ? "opacity-45 cursor-not-allowed line-through" : ""}`}
            >
              <span
                className="h-4 w-4 rounded-full border border-black/15 shadow-inner flex-shrink-0"
                style={{ backgroundColor: swatch.hex }}
              />
              <span>{swatch.name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
