"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Product } from "@/types";
import { formatPrice, getProductImageUrl } from "@/lib/utils";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { cartApi, wishlistApi } from "@/lib/api";
import { useAuthStore, useGuestCartStore, useUIStore } from "@/store";
import { Heart, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

const CARD_SIZES: { label: string; key: keyof Product }[] = [
  { label: "S", key: "sizeS" },
  { label: "M", key: "sizeM" },
  { label: "L", key: "sizeL" },
  { label: "XL", key: "sizeXl" },
  { label: "XXL", key: "sizeXxl" },
];

export function ProductCard({ product }: { product: Product }) {
  const [imgError, setImgError] = useState(false);
  const [secondaryImgError, setSecondaryImgError] = useState(false);
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const addGuestItem = useGuestCartStore((s) => s.addItem);
  const setCartOpen = useUIStore((s) => s.setCartOpen);

  const isCustomer = !!user && user.role === "CUSTOMER";
  const hasDiscount =
    product.mrp != null && product.price != null && product.mrp > product.price;

  const { data: wishlistData } = useQuery({
    queryKey: ["wishlist"],
    queryFn: () => wishlistApi.list(),
    enabled: isCustomer,
  });

  const isInWishlist =
    wishlistData?.items?.some(
      (item: { productId: number }) => item.productId === product.id,
    ) || false;

  const wishlistMutation = useMutation({
    mutationFn: () => wishlistApi.toggle(product.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });

  const availableSizes = CARD_SIZES.filter(
    (s) => product[s.key] != null && (product[s.key] as number) > 0,
  ).map((s) => s.label);

  const hasFreeSizeStock = availableSizes.length === 0 && (product.quantity ?? 0) > 0;
  const inStock = availableSizes.length > 0 || hasFreeSizeStock;

  const quickAddMutation = useMutation({
    mutationFn: async (size: string) => {
      if (isCustomer) {
        return cartApi.add(product.id, size, 1);
      }
      const stockForSize =
        size === "FREE_SIZE"
          ? product.quantity ?? 1
          : Number(
              product[
                CARD_SIZES.find((s) => s.label === size)?.key ?? "quantity"
              ] ?? 1,
            );
      addGuestItem({
        productId: product.id,
        name: product.name || "Product",
        price: product.price || 0,
        mrp: product.mrp ?? null,
        image: product.image || product.image1 || null,
        size,
        quantity: 1,
        availableStock: stockForSize,
        availableSizes: availableSizes.length > 0 ? availableSizes : ["FREE_SIZE"],
      });
      return { success: true };
    },
    onSuccess: (_data, size) => {
      if (isCustomer) {
        queryClient.invalidateQueries({ queryKey: ["cart"] });
      }
      toast.success(
        `Added ${product.name || "item"} (${size === "FREE_SIZE" ? "Free Size" : size}) to bag`,
      );
      setCartOpen(true);
    },
    onError: (err: Error) => toast.error(err.message || "Could not add to bag"),
  });

  const primarySrc = imgError
    ? "https://placehold.co/600x800/fce7f3/a81c44?text=Beauty+Queen"
    : getProductImageUrl(product.image || product.image1 || "");

  const hasSecondaryImage =
    !secondaryImgError &&
    !!product.image1 &&
    product.image1 !== product.image;

  const secondarySrc = hasSecondaryImage
    ? getProductImageUrl(product.image1)
    : null;

  return (
    <Card className="group relative overflow-hidden card-hover border-border/80">
      <div className="relative aspect-[3/4] overflow-hidden bg-muted">
        <Link
          href={`/product/${product.id}`}
          aria-label={`View ${product.name || "product"}`}
          className="block h-full w-full"
        >
          <Image
            src={primarySrc}
            alt={product.name || "Product image"}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className={`object-cover transition-all duration-500 ${
              secondarySrc ? "group-hover:opacity-0" : "group-hover:scale-105"
            }`}
            onError={() => setImgError(true)}
            unoptimized={primarySrc.startsWith("http") && !primarySrc.includes("localhost")}
          />
          {secondarySrc && (
            <Image
              src={secondarySrc}
              alt={`${product.name || "Product"} alternate view`}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className="object-cover opacity-0 transition-all duration-500 group-hover:opacity-100 group-hover:scale-105"
              onError={() => setSecondaryImgError(true)}
              unoptimized={secondarySrc.startsWith("http") && !secondarySrc.includes("localhost")}
            />
          )}
          {hasDiscount && (
            <span className="absolute top-2 left-2 rounded-md bg-[#1A0B10]/85 px-2 py-0.5 text-[11px] font-semibold text-[#D4A353] z-10 shadow-sm">
              {Math.round(((product.mrp! - product.price!) / product.mrp!) * 100)}% OFF
            </span>
          )}
        </Link>

        {/* Hover Quick-Add Bar */}
        {inStock && (
          <div className="hidden sm:block absolute inset-x-2 bottom-2 z-20 translate-y-2 opacity-0 transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100">
            <div className="rounded-lg bg-[#1A0B10]/90 backdrop-blur-sm p-2 text-[#FBF7F2] shadow-lg border border-[#D4A353]/25">
              {availableSizes.length > 0 ? (
                <div className="space-y-1.5">
                  <p className="text-[10px] text-[#D4A353] font-medium text-center">
                    Quick add size
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-1">
                    {availableSizes.map((sz) => (
                      <button
                        key={sz}
                        type="button"
                        disabled={quickAddMutation.isPending}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          quickAddMutation.mutate(sz);
                        }}
                        className="min-w-[28px] rounded bg-[#FBF7F2]/12 px-2 py-1 text-[11px] font-semibold text-[#FBF7F2] hover:bg-[#A81C44] transition-colors disabled:opacity-50"
                      >
                        {sz}
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  disabled={quickAddMutation.isPending}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    quickAddMutation.mutate("FREE_SIZE");
                  }}
                  className="flex w-full items-center justify-center gap-1.5 rounded bg-[#A81C44] py-1.5 text-xs font-semibold text-[#FBF7F2] hover:bg-[#8C1537] transition-colors disabled:opacity-50"
                >
                  <ShoppingBag className="h-3.5 w-3.5" />
                  <span>Quick Add</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {isCustomer && (
        <button
          onClick={(e) => {
            e.preventDefault();
            wishlistMutation.mutate();
          }}
          className={`absolute top-2 right-2 rounded-full p-1.5 shadow-sm hover:shadow transition-all z-10 ${
            isInWishlist
              ? "bg-primary hover:bg-primary/90"
              : "bg-white/90 hover:bg-white"
          }`}
          aria-label={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
          title={isInWishlist ? "Remove from wishlist" : "Add to wishlist"}
        >
          <Heart
            className={`h-4 w-4 ${isInWishlist ? "fill-white text-white" : "text-primary"}`}
          />
        </button>
      )}

      <CardContent className="p-3 sm:p-4">
        <Link href={`/product/${product.id}`}>
          <h3 className="font-medium text-foreground truncate hover:text-primary transition-colors text-sm sm:text-base">
            {product.name}
          </h3>
        </Link>
        {product.ptype && (
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">{product.ptype}</p>
        )}
        <div className="mt-2 flex items-center gap-2 flex-wrap tabular-nums">
          {product.price != null && (
            <span className="text-base sm:text-lg font-bold text-primary">
              {formatPrice(product.price)}
            </span>
          )}
          {hasDiscount && (
            <span className="text-xs sm:text-sm text-muted-foreground line-through">
              {formatPrice(product.mrp!)}
            </span>
          )}
        </div>
        {hasDiscount && (
          <span className="mt-1.5 inline-block rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] sm:text-xs font-medium text-emerald-800">
            Save {formatPrice(product.mrp! - product.price!)}
          </span>
        )}
        <Link href={`/product/${product.id}`}>
          <Button
            className="mt-3 w-full bg-primary hover:bg-primary/90 text-primary-foreground"
            size="sm"
          >
            View Details
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
