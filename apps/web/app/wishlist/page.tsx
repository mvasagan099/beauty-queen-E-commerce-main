"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { wishlistApi } from "@/lib/api";
import { WishlistItem } from "@/types";
import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ShoppingCart } from "lucide-react";
import Link from "next/link";

interface WishlistResponse {
  items: WishlistItem[];
  count: number;
}

export default function WishlistPage() {
  const queryClient = useQueryClient();
  const [movingId, setMovingId] = useState<number | null>(null);

  const { data, isLoading } = useQuery<WishlistResponse>({
    queryKey: ["wishlist"],
    queryFn: () => wishlistApi.list(),
  });

  const clearMutation = useMutation({
    mutationFn: () => wishlistApi.clear(),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["wishlist"] }),
  });

  const moveMutation = useMutation({
    mutationFn: (productId: number) => wishlistApi.moveToCart(productId),
    onMutate: (productId) => setMovingId(productId),
    onSuccess: (res) => {
      setMovingId(null);
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success(res?.message || "Moved to cart");
    },
    onError: (err: Error) => {
      setMovingId(null);
      toast.error(err.message || "Could not move to cart");
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
      </div>
    );
  }

  const items = data?.items || [];

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Wishlist</h1>
        {items.length > 0 && (
          <Button
            variant="outline"
            className="text-red-600 border-red-600 hover:bg-red-50"
            onClick={() => {
              if (confirm("Clear entire wishlist?")) {
                clearMutation.mutate();
              }
            }}
          >
            Clear All
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 min-h-[40vh] justify-center">
          <p className="text-gray-500">Your wishlist is empty.</p>
          <Link href="/">
            <Button className="bg-pink-500 hover:bg-pink-600 text-white">
              Browse Products
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4 md:gap-6">
          {items
            .filter((item) => item.product && typeof item.product === "object")
            .map((item) => (
              <div key={item.id} className="flex flex-col">
                <ProductCard product={item.product} />
                <Button
                  className="mt-2 w-full h-9 bg-pink-500 hover:bg-pink-600 text-white text-xs"
                  disabled={movingId === item.product.id}
                  onClick={() => moveMutation.mutate(item.product.id)}
                  title="Move to cart"
                >
                  <ShoppingCart className="h-4 w-4 mr-1.5" />
                  {movingId === item.product.id ? "Moving..." : "Move to Cart"}
                </Button>
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
