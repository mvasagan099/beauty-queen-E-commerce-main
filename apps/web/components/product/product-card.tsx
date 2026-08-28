"use client";

import Link from "next/link";
import Image from "next/image";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Product } from "@/types";
import { formatPrice, getProductImageUrl } from "@/lib/utils";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { wishlistApi } from "@/lib/api";
import { useAuthStore } from "@/store";
import { Heart } from "lucide-react";

export function ProductCard({ product }: { product: Product }) {
  const [imgError, setImgError] = useState(false);
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const hasDiscount =
    product.mrp != null && product.price != null && product.mrp > product.price;

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
    <Card className="group relative overflow-hidden hover:shadow-lg transition-shadow">
      <Link href={`/product/${product.id}`} aria-label={`View ${product.name || "product"}`}>
        <div className="relative aspect-square overflow-hidden bg-gray-100">
          <Image
            src={imageUrl}
            alt={product.name || "Product image"}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-cover transition-transform group-hover:scale-105"
            onError={() => setImgError(true)}
            unoptimized={imageUrl.startsWith("http") && !imageUrl.includes("localhost")}
          />
          {hasDiscount && (
            <span className="absolute top-2 left-2 rounded bg-green-500 px-2 py-0.5 text-xs font-medium text-white z-10">
              {Math.round(((product.mrp! - product.price!) / product.mrp!) * 100)}% OFF
            </span>
          )}
        </div>
      </Link>
      {user && (
        <button
          onClick={() => wishlistMutation.mutate()}
          className="absolute top-2 right-2 rounded-full bg-white/80 p-1.5 shadow hover:bg-white"
          aria-label="Toggle wishlist"
          title="Toggle wishlist"
        >
          <Heart className="h-4 w-4 text-pink-500" />
        </button>
      )}
      <CardContent className="p-4">
        <Link href={`/product/${product.id}`}>
          <h3 className="font-medium text-gray-900 truncate hover:text-pink-500">
            {product.name}
          </h3>
        </Link>
        {product.ptype && (
          <p className="text-xs text-gray-400 mt-1 capitalize">{product.ptype}</p>
        )}
        <div className="mt-2 flex items-center gap-2">
          {product.price != null && (
            <span className="text-lg font-bold text-pink-500">
              {formatPrice(product.price)}
            </span>
          )}
          {hasDiscount && (
            <span className="text-sm text-gray-400 line-through">
              {formatPrice(product.mrp!)}
            </span>
          )}
        </div>
        {hasDiscount && (
          <span className="mt-1 inline-block rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
            Save {formatPrice(product.mrp! - product.price!)}
          </span>
        )}
        <Link href={`/product/${product.id}`}>
          <Button className="mt-3 w-full bg-pink-500 hover:bg-pink-600 text-white" size="sm">
            View Details
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
