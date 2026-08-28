"use client";

import { useState, useEffect, useCallback, useId } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { searchApi } from "@/lib/api";
import { Product } from "@/types";
import Link from "next/link";
import { formatPrice, getProductImageUrl } from "@/lib/utils";
import Image from "next/image";

interface SearchBarProps {
  className?: string;
  placeholder?: string;
}

const CATEGORY_LABEL: Record<string, string> = {
  saree: "Sarees",
  kurthi: "Kurthis",
  top: "Tops",
  leggin: "Leggins",
  cosmetics: "Cosmetics",
};

export function SearchBar({
  className = "",
  placeholder = "Search products...",
}: SearchBarProps) {
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const router = useRouter();
  const inputId = useId();

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(query);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, isLoading } = useQuery({
    queryKey: ["search-suggestions", debouncedQuery],
    queryFn: () => searchApi.suggestions(debouncedQuery, 5),
    enabled: debouncedQuery.length >= 2,
  });

  const results: Product[] = data?.products || [];
  const categories: string[] = data?.categories || [];

  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (query.trim()) {
        router.push(`/search?q=${encodeURIComponent(query.trim())}`);
        setQuery("");
        setShowDropdown(false);
      }
    },
    [query, router],
  );

  const navigateAway = useCallback(() => {
    setQuery("");
    setShowDropdown(false);
  }, []);

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="flex items-center" role="search">
        <label htmlFor={inputId} className="sr-only">
          Search products
        </label>
        <input
          id={inputId}
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowDropdown(true);
          }}
          onFocus={() => query.length >= 2 && setShowDropdown(true)}
          onBlur={() => setTimeout(() => setShowDropdown(false), 200)}
          placeholder={placeholder}
          className="h-9 rounded-l-md border px-3 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500 w-full"
          autoComplete="off"
        />
        <button
          type="submit"
          className="h-9 rounded-r-md bg-pink-500 px-3 text-white hover:bg-pink-600 flex-shrink-0"
          aria-label="Search"
        >
          <Search className="h-4 w-4" />
        </button>
      </form>

      {showDropdown && isLoading && debouncedQuery.length >= 2 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-lg shadow-lg p-4 text-center text-sm text-gray-500">
          Searching...
        </div>
      )}

      {showDropdown && !isLoading && (results.length > 0 || categories.length > 0) && (
        <div
          className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-lg shadow-lg max-h-80 overflow-y-auto"
          role="listbox"
        >
          {results.slice(0, 5).map((product) => (
            <Link
              key={product.id}
              href={`/product/${product.id}`}
              onClick={navigateAway}
              className="flex items-center gap-3 p-3 hover:bg-gray-50 border-b last:border-b-0"
              role="option"
            >
              <div className="relative h-12 w-12 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                <Image
                  src={getProductImageUrl(product.image || product.image1)}
                  alt={product.name || "Product"}
                  fill
                  sizes="48px"
                  className="object-cover"
                  unoptimized
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {product.name}
                </p>
                {product.price != null && (
                  <p className="text-sm text-pink-500 font-bold">
                    {formatPrice(product.price)}
                  </p>
                )}
              </div>
            </Link>
          ))}

          {categories.length > 0 && (
            <div className="p-2 border-t border-gray-100">
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
                Categories
              </p>
              <div className="flex flex-wrap gap-1.5 px-2 pb-1">
                {categories.map((slug) => (
                  <Link
                    key={slug}
                    href={`/${slug}`}
                    onClick={navigateAway}
                    className="rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700 hover:bg-pink-50 hover:text-pink-600"
                  >
                    {CATEGORY_LABEL[slug] || slug}
                  </Link>
                ))}
              </div>
            </div>
          )}

          {results.length > 0 && (
            <Link
              href={`/search?q=${encodeURIComponent(debouncedQuery)}`}
              onClick={navigateAway}
              className="block p-3 text-center text-sm text-pink-500 hover:bg-gray-50"
            >
              View all results for &ldquo;{debouncedQuery}&rdquo;
            </Link>
          )}
        </div>
      )}

      {showDropdown && debouncedQuery.length >= 2 && !isLoading && results.length === 0 && categories.length === 0 && (
        <div className="absolute top-full left-0 right-0 z-50 mt-1 bg-white border rounded-lg shadow-lg p-4 text-center text-sm text-gray-500">
          No matches found for &ldquo;{debouncedQuery}&rdquo;
        </div>
      )}
    </div>
  );
}