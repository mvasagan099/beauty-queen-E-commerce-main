"use client";

import { useState } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface CatalogFilterValues {
  sort: string;
  minPrice?: number;
  maxPrice?: number;
  size?: string;
  inStock?: boolean;
}

interface ProductFiltersProps {
  values: CatalogFilterValues;
  totalCount?: number;
  showSizeFilter?: boolean;
  sortOptions?: { value: string; label: string }[];
  onChange: (next: Partial<CatalogFilterValues>) => void;
  onReset: () => void;
}

const DEFAULT_SORT_OPTIONS = [
  { value: "", label: "Featured" },
  { value: "newest", label: "Newest First" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "name_asc", label: "Name: A to Z" },
];

const PRICE_PRESETS: { label: string; min?: number; max?: number }[] = [
  { label: "Under ₹999", min: undefined, max: 999 },
  { label: "₹1,000 – ₹2,499", min: 1000, max: 2499 },
  { label: "₹2,500 – ₹4,999", min: 2500, max: 4999 },
  { label: "₹5,000+", min: 5000, max: undefined },
];

const SIZE_OPTIONS = [
  { value: "S", label: "S" },
  { value: "M", label: "M" },
  { value: "L", label: "L" },
  { value: "XL", label: "XL" },
  { value: "XXL", label: "XXL" },
  { value: "FREE_SIZE", label: "Free Size" },
];

export function ProductFilters({
  values,
  totalCount,
  showSizeFilter = true,
  sortOptions = DEFAULT_SORT_OPTIONS,
  onChange,
  onReset,
}: ProductFiltersProps) {
  const [panelOpen, setPanelOpen] = useState(false);
  const [minDraft, setMinDraft] = useState(
    values.minPrice != null ? String(values.minPrice) : "",
  );
  const [maxDraft, setMaxDraft] = useState(
    values.maxPrice != null ? String(values.maxPrice) : "",
  );

  const activeChips: { key: string; label: string; clear: () => void }[] = [];

  if (values.minPrice != null || values.maxPrice != null) {
    const label =
      values.minPrice != null && values.maxPrice != null
        ? `₹${values.minPrice.toLocaleString("en-IN")} – ₹${values.maxPrice.toLocaleString("en-IN")}`
        : values.minPrice != null
        ? `Above ₹${values.minPrice.toLocaleString("en-IN")}`
        : `Under ₹${values.maxPrice!.toLocaleString("en-IN")}`;
    activeChips.push({
      key: "price",
      label,
      clear: () => {
        setMinDraft("");
        setMaxDraft("");
        onChange({ minPrice: undefined, maxPrice: undefined });
      },
    });
  }

  if (values.size) {
    activeChips.push({
      key: "size",
      label: `Size: ${values.size === "FREE_SIZE" ? "Free Size" : values.size}`,
      clear: () => onChange({ size: undefined }),
    });
  }

  if (values.inStock) {
    activeChips.push({
      key: "inStock",
      label: "In stock only",
      clear: () => onChange({ inStock: undefined }),
    });
  }

  const applyCustomPrice = (e: React.FormEvent) => {
    e.preventDefault();
    const min = minDraft.trim() ? Math.max(0, Number(minDraft)) : undefined;
    const max = maxDraft.trim() ? Math.max(0, Number(maxDraft)) : undefined;
    onChange({
      minPrice: Number.isFinite(min) ? min : undefined,
      maxPrice: Number.isFinite(max) ? max : undefined,
    });
  };

  return (
    <div className="mb-6 space-y-3">
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <Button
            type="button"
            variant={panelOpen || activeChips.length > 0 ? "default" : "outline"}
            size="sm"
            onClick={() => setPanelOpen((o) => !o)}
            className="gap-2"
            aria-expanded={panelOpen}
          >
            <SlidersHorizontal className="h-4 w-4" />
            <span>Filters</span>
            {activeChips.length > 0 && (
              <span className="ml-0.5 rounded-full bg-background/20 px-1.5 py-0.5 text-[11px] font-semibold">
                {activeChips.length}
              </span>
            )}
          </Button>
          {totalCount != null && (
            <span className="text-xs sm:text-sm text-muted-foreground tabular-nums">
              {totalCount} product{totalCount === 1 ? "" : "s"}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label htmlFor="catalog-sort" className="text-xs text-muted-foreground hidden sm:inline">
            Sort by
          </label>
          <select
            id="catalog-sort"
            value={values.sort}
            onChange={(e) => onChange({ sort: e.target.value })}
            className="rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            aria-label="Sort products"
          >
            {sortOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Expandable Faceted Filter Drawer */}
      {panelOpen && (
        <div className="rounded-xl border border-border bg-card p-4 sm:p-5 shadow-sm grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Price Range */}
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-foreground">Price range</h3>
            <div className="flex flex-wrap gap-1.5">
              {PRICE_PRESETS.map((preset) => {
                const selected =
                  values.minPrice === preset.min && values.maxPrice === preset.max;
                return (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => {
                      setMinDraft(preset.min != null ? String(preset.min) : "");
                      setMaxDraft(preset.max != null ? String(preset.max) : "");
                      onChange({ minPrice: preset.min, maxPrice: preset.max });
                    }}
                    className={`rounded-md px-2.5 py-1.5 text-xs font-medium border transition-colors ${
                      selected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-foreground hover:border-primary/50"
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <form onSubmit={applyCustomPrice} className="flex items-center gap-2 pt-1">
              <input
                type="number"
                min={0}
                placeholder="Min ₹"
                value={minDraft}
                onChange={(e) => setMinDraft(e.target.value)}
                aria-label="Minimum price"
                className="h-8 w-24 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <span className="text-xs text-muted-foreground">to</span>
              <input
                type="number"
                min={0}
                placeholder="Max ₹"
                value={maxDraft}
                onChange={(e) => setMaxDraft(e.target.value)}
                aria-label="Maximum price"
                className="h-8 w-24 rounded-md border border-input bg-background px-2 text-xs focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button type="submit" size="sm" variant="outline" className="h-8 px-2.5 text-xs">
                Apply
              </Button>
            </form>
          </div>

          {/* Size Filter */}
          {showSizeFilter && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-foreground">Size &amp; fit</h3>
              <div className="flex flex-wrap gap-2">
                {SIZE_OPTIONS.map((opt) => {
                  const selected = values.size === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() =>
                        onChange({ size: selected ? undefined : opt.value })
                      }
                      className={`min-w-[42px] rounded-md px-3 py-1.5 text-xs font-medium border transition-colors ${
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border bg-background text-foreground hover:border-primary/50"
                      }`}
                    >
                      {opt.label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Availability + Reset */}
          <div className="flex flex-col justify-between gap-4">
            <div className="space-y-2.5">
              <h3 className="text-sm font-semibold text-foreground">Availability</h3>
              <label className="inline-flex items-center gap-2.5 text-sm text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!values.inStock}
                  onChange={(e) =>
                    onChange({ inStock: e.target.checked ? true : undefined })
                  }
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <span>Show ready-to-ship stock only</span>
              </label>
            </div>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setMinDraft("");
                  setMaxDraft("");
                  onReset();
                }}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                Reset all filters
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Active Filter Chips */}
      {activeChips.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {activeChips.map((chip) => (
            <button
              key={chip.key}
              type="button"
              onClick={chip.clear}
              className="inline-flex items-center gap-1.5 rounded-full border border-primary/25 bg-primary/8 px-3 py-1 text-xs font-medium text-primary hover:bg-primary/15 transition-colors"
            >
              <span>{chip.label}</span>
              <X className="h-3 w-3" />
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setMinDraft("");
              setMaxDraft("");
              onReset();
            }}
            className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
          >
            Clear all
          </button>
        </div>
      )}
    </div>
  );
}
