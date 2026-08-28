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
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
      </div>
    );
  }

  const cart = data?.data;
  const items = cart?.items || [];
  const updating = removeMutation.isPending || updateMutation.isPending;

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Shopping Cart</h1>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-4 min-h-[40vh] justify-center">
          <p className="text-gray-500">Your cart is empty.</p>
          <Link href="/">
            <Button className="bg-pink-500 hover:bg-pink-600 text-white">
              Continue Shopping
            </Button>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
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
