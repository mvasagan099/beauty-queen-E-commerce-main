"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cartApi } from "@/lib/api";
import { CartItem, CartResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { useAuthStore, useCheckoutStore, useGuestCartStore } from "@/store";
import { CartList } from "@/components/cart/CartList";
import { CartSummary } from "@/components/cart/CartSummary";
import { LoadingPage } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { ShoppingCart } from "lucide-react";

export default function CartPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const setCartMode = useCheckoutStore((s) => s.setCartMode);

  const guestItems = useGuestCartStore((s) => s.items);
  const updateGuestItem = useGuestCartStore((s) => s.updateItem);
  const removeGuestItem = useGuestCartStore((s) => s.removeItem);

  const isCustomer = !!user && user.role === "CUSTOMER";

  const { data, isLoading } = useQuery<{ success: boolean; data: CartResponse }>({
    queryKey: ["cart"],
    queryFn: () => cartApi.get(),
    enabled: isCustomer,
  });

  const removeMutation = useMutation({
    mutationFn: (itemId: number) => cartApi.remove(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Item removed from bag");
    },
    onError: (err: Error) => toast.error(err.message || "Could not remove item"),
  });

  const updateMutation = useMutation({
    mutationFn: (args: { itemId: number; quantity: number; size?: string }) =>
      cartApi.update(args.itemId, args.quantity, args.size),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
    onError: (err: Error) => toast.error(err.message || "Could not update item"),
  });

  if (isCustomer && isLoading) {
    return <LoadingPage text="Loading your cart..." />;
  }

  const items: CartItem[] = isCustomer
    ? data?.data?.items || []
    : guestItems.map((g) => ({
        ...g,
        subtotal: g.price * g.quantity,
      }));

  const subtotal = isCustomer
    ? data?.data?.subtotal || 0
    : items.reduce((sum, i) => sum + i.subtotal, 0);

  const discount = isCustomer
    ? data?.data?.discount || 0
    : items.reduce((sum, i) => {
        const mrp = i.mrp && i.mrp > i.price ? i.mrp : i.price;
        return sum + (mrp - i.price) * i.quantity;
      }, 0);

  const shipping = isCustomer ? data?.data?.shipping || 0 : 0;
  const tax = isCustomer ? data?.data?.tax || 0 : 0;
  const total = isCustomer ? data?.data?.total || 0 : subtotal;
  const totalItemCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const updating = removeMutation.isPending || updateMutation.isPending;

  return (
    <div className="page-container">
      <div className="flex flex-wrap items-baseline justify-between gap-2 mb-8">
        <h1 className="page-title mb-0">Shopping Cart</h1>
        {!isCustomer && items.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Saved on this device — sign in at checkout to sync your bag.
          </p>
        )}
      </div>

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
              onQuantityChange={(itemId, quantity) => {
                if (isCustomer) {
                  updateMutation.mutate({ itemId, quantity });
                } else {
                  updateGuestItem(itemId, quantity);
                }
              }}
              onSizeChange={(itemId, size, quantity) => {
                if (isCustomer) {
                  updateMutation.mutate({ itemId, quantity, size });
                } else {
                  updateGuestItem(itemId, quantity, size);
                }
              }}
              onRemove={(itemId) => {
                if (isCustomer) {
                  removeMutation.mutate(itemId);
                } else {
                  removeGuestItem(itemId);
                  toast.success("Item removed from bag");
                }
              }}
            />
          </div>

          <div>
            <CartSummary
              itemCount={totalItemCount}
              subtotal={subtotal}
              discount={discount}
              shipping={shipping}
              tax={tax}
              total={total}
              ctaLabel={isCustomer ? "Proceed to Checkout" : "Sign In to Checkout"}
              onCheckout={() => {
                if (!isCustomer) {
                  router.push("/login?redirect=/checkout");
                  return;
                }
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
