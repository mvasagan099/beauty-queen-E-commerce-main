"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Product } from "@/types";
import { formatPrice, getProductImageUrl } from "@/lib/utils";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { wishlistApi } from "@/lib/api";
import { useAuthStore } from "@/store";
import { Heart } from "lucide-react";

export function ProductCard({ product }: { product: Product }) {
  const [imgError, setImgError] = useState(false);
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const hasDiscount =
    product.mrp != null && product.price != null && product.mrp > product.price;

  const { data: wishlistData } = useQuery({
    queryKey: ["wishlist"],
    queryFn: () => wishlistApi.list(),
    enabled: !!user,
  });

  const isInWishlist = wishlistData?.items?.some(
    (item: { productId: number }) => item.productId === product.id
  ) || false;

  const wishlistMutation = useMutation({
    mutationFn: () => wishlistApi.toggle(product.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });

  const imageUrl = imgError
    ? "https://placehold.co/600x800/fce7f3/ec4899?text=No+Image"
    : getProductImageUrl(product.image || product.image1 || "");

  return (
    <Card className="group relative overflow-hidden card-hover">
      <Link href={`/product/${product.id}`} aria-label={`View ${product.name || "product"}`}>
        <div className="relative aspect-[3/4] overflow-hidden bg-gray-100">
          <Image
            src={imageUrl}
            alt={product.name || "Product image"}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            onError={() => setImgError(true)}
            unoptimized={imageUrl.startsWith("http") && !imageUrl.includes("localhost")}
          />
          {hasDiscount && (
            <span className="absolute top-2 left-2 rounded-full bg-destructive px-2.5 py-0.5 text-xs font-bold text-destructive-foreground z-10 shadow-sm">
              {Math.round(((product.mrp! - product.price!) / product.mrp!) * 100)}% OFF
            </span>
          )}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors" />
        </div>
      </Link>
      {user && (
        <button
          onClick={(e) => {
            e.preventDefault();
            wishlistMutation.mutate();
          }}
          className={`absolute top-2 right-2 rounded-full p-1.5 shadow-sm hover:shadow transition-all z-10 ${
            isInWishlist
              ? "bg-pink-500 hover:bg-pink-600"
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
        <div className="mt-2 flex items-center gap-2 flex-wrap">
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
          <span className="mt-1.5 inline-block rounded-full bg-green-100 px-2 py-0.5 text-[10px] sm:text-xs font-medium text-green-700">
            Save {formatPrice(product.mrp! - product.price!)}
          </span>
        )}
        <Link href={`/product/${product.id}`}>
          <Button className="mt-3 w-full bg-primary hover:bg-primary/90 text-primary-foreground" size="sm">
            View Details
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
