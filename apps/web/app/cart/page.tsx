"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { cartApi } from "@/lib/api";
import { CartResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { useCheckoutStore } from "@/store";
import { CartList } from "@/components/cart/CartList";
import { CartSummary } from "@/components/cart/CartSummary";
import { LoadingPage } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { ShoppingCart } from "lucide-react";

export default function CartPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const setCartMode = useCheckoutStore((s) => s.setCartMode);

  const { data, isLoading } = useQuery<{ success: boolean; data: CartResponse }>({
    queryKey: ["cart"],
    queryFn: () => cartApi.get(),
  });

  const removeMutation = useMutation({
    mutationFn: (itemId: number) => cartApi.remove(itemId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });

  const updateMutation = useMutation({
    mutationFn: (args: { itemId: number; quantity: number }) =>
      cartApi.update(args.itemId, args.quantity),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
  });

  if (isLoading) {
    return <LoadingPage text="Loading your cart..." />;
  }

  const cart = data?.data;
  const items = cart?.items || [];
  const updating = removeMutation.isPending || updateMutation.isPending;

  return (
    <div className="page-container">
      <h1 className="page-title">Shopping Cart</h1>

      {items.length === 0 ? (
        <EmptyState
          icon={<ShoppingCart className="h-8 w-8" />}
          title="Your cart is empty"
          description="Looks like you haven't added anything to your cart yet. Browse our collections to find something you love."
          action={
            <Link href="/">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
                Continue Shopping
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
          <div className="lg:col-span-2 space-y-4">
            <CartList
              items={items}
              updating={updating}
              onQuantityChange={(itemId, quantity) =>
                updateMutation.mutate({ itemId, quantity })
              }
              onRemove={(itemId) => removeMutation.mutate(itemId)}
            />
          </div>

          <div>
            <CartSummary
              itemCount={items.length}
              subtotal={cart?.subtotal || 0}
              discount={cart?.discount || 0}
              shipping={cart?.shipping || 0}
              tax={cart?.tax || 0}
              total={cart?.total || 0}
              onCheckout={() => {
                setCartMode();
                router.push("/checkout");
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
