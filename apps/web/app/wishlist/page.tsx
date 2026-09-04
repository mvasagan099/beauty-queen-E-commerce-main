"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { wishlistApi } from "@/lib/api";
import { WishlistItem } from "@/types";
import { ProductCard } from "@/components/product/product-card";
import { Button } from "@/components/ui/button";
import { LoadingPage } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { toast } from "sonner";
import { ShoppingCart, Heart } from "lucide-react";
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
    return <LoadingPage text="Loading your wishlist..." />;
  }

  const items = data?.items || [];

  return (
    <div className="page-container">
      <div className="flex items-center justify-between mb-8">
        <h1 className="page-title mb-0">My Wishlist</h1>
        {items.length > 0 && (
          <Button
            variant="outline"
            className="text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground"
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
        <EmptyState
          icon={<Heart className="h-8 w-8" />}
          title="Your wishlist is empty"
          description="Save items you love to your wishlist and come back to them anytime."
          action={
            <Link href="/">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                Browse Products
                <ShoppingCart className="h-4 w-4" />
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          {items
            .filter((item) => item.product && typeof item.product === "object")
            .map((item) => (
              <div key={item.id} className="flex flex-col">
                <ProductCard product={item.product} />
                <Button
                  className="mt-2 w-full bg-primary hover:bg-primary/90 text-primary-foreground text-xs h-9"
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
