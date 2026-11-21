"use client";

import { useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X, ShoppingBag, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cartApi } from "@/lib/api";
import { formatPrice, getProductImageUrl } from "@/lib/utils";
import {
  useAuthStore,
  useCheckoutStore,
  useGuestCartStore,
  useUIStore,
} from "@/store";
import { CartItem, CartResponse } from "@/types";
import { Button } from "@/components/ui/button";

function formatSizeLabel(size: string) {
  if (size === "FREE_SIZE" || size === "ONE_SIZE") return "Free Size";
  return size;
}

export function CartDrawer() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { isCartOpen, setCartOpen } = useUIStore();
  const setCartMode = useCheckoutStore((s) => s.setCartMode);

  const guestItems = useGuestCartStore((s) => s.items);
  const updateGuestItem = useGuestCartStore((s) => s.updateItem);
  const removeGuestItem = useGuestCartStore((s) => s.removeItem);
  const clearGuestCart = useGuestCartStore((s) => s.clear);

  const syncingRef = useRef(false);

  // Automatically merge any guest cart items into the server cart upon customer login
  useEffect(() => {
    if (!user || user.role !== "CUSTOMER" || guestItems.length === 0 || syncingRef.current) {
      return;
    }

    syncingRef.current = true;
    const snapshot = [...guestItems];

    (async () => {
      let syncedCount = 0;
      for (const item of snapshot) {
        try {
          await cartApi.add(item.productId, item.size, item.quantity);
          syncedCount += 1;
        } catch {
          // Skip items that became out of stock or unavailable during sync
        }
      }
      clearGuestCart();
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      if (syncedCount > 0) {
        toast.success(
          `Synced ${syncedCount} saved item${syncedCount === 1 ? "" : "s"} to your bag`,
        );
      }
      syncingRef.current = false;
    })();
  }, [user, guestItems, clearGuestCart, queryClient]);

  // Close drawer on Escape key
  useEffect(() => {
    if (!isCartOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setCartOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isCartOpen, setCartOpen]);

  const { data: serverCartRes } = useQuery<{ success: boolean; data: CartResponse }>({
    queryKey: ["cart"],
    queryFn: () => cartApi.get(),
    enabled: !!user && user.role === "CUSTOMER",
  });

  const updateMutation = useMutation({
    mutationFn: ({ itemId, quantity, size }: { itemId: number; quantity: number; size?: string }) =>
      cartApi.update(itemId, quantity, size),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["cart"] }),
    onError: (err: Error) => toast.error(err.message || "Could not update item"),
  });

  const removeMutation = useMutation({
    mutationFn: (itemId: number) => cartApi.remove(itemId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      toast.success("Item removed from bag");
    },
    onError: (err: Error) => toast.error(err.message || "Could not remove item"),
  });

  const isCustomer = !!user && user.role === "CUSTOMER";

  const items: CartItem[] = isCustomer
    ? serverCartRes?.data?.items || []
    : guestItems.map((g) => ({
        ...g,
        subtotal: g.price * g.quantity,
      }));

  const subtotal = isCustomer
    ? serverCartRes?.data?.subtotal || 0
    : items.reduce((sum, i) => sum + i.subtotal, 0);

  const mrpSavings = isCustomer
    ? serverCartRes?.data?.discount || 0
    : items.reduce((sum, i) => {
        const mrp = i.mrp && i.mrp > i.price ? i.mrp : i.price;
        return sum + (mrp - i.price) * i.quantity;
      }, 0);

  const total = isCustomer ? serverCartRes?.data?.total || 0 : subtotal;
  const totalCount = items.reduce((sum, i) => sum + i.quantity, 0);
  const busy = updateMutation.isPending || removeMutation.isPending;

  if (!isCartOpen) return null;

  const handleCheckout = () => {
    setCartOpen(false);
    if (!isCustomer) {
      router.push("/login?redirect=/checkout");
      return;
    }
    setCartMode();
    router.push("/checkout");
  };

  return (
    <div className="fixed inset-0 z-50 flex justify-end" role="dialog" aria-modal="true" aria-label="Shopping bag">
      <div
        className="fixed inset-0 bg-[#1A0B10]/55 backdrop-blur-sm transition-opacity"
        onClick={() => setCartOpen(false)}
      />

      <aside className="relative z-10 flex h-full w-full max-w-md flex-col bg-[#FBF7F2] text-foreground shadow-2xl border-l border-border animate-slide-in-right">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h2 className="font-display text-2xl font-semibold text-foreground">Your Bag</h2>
            <p className="text-xs text-muted-foreground">
              {totalCount} item{totalCount === 1 ? "" : "s"}
              {!isCustomer && totalCount > 0 ? " saved on this device" : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setCartOpen(false)}
            className="rounded-md p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            aria-label="Close shopping bag"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-3 scrollbar-thin">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center space-y-3">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
                <ShoppingBag className="h-6 w-6" />
              </div>
              <p className="font-display text-xl font-semibold text-foreground">Your bag is empty</p>
              <p className="text-xs text-muted-foreground max-w-xs">
                Explore handpicked sarees, kurthis, tops, leggings, and cosmetics to add pieces here.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCartOpen(false);
                  router.push("/saree");
                }}
              >
                Explore Sarees
              </Button>
            </div>
          ) : (
            items.map((item) => {
              const maxStock = item.availableStock ?? 99;
              const atMax = item.quantity >= maxStock;
              const canSwitchSize = item.availableSizes && item.availableSizes.length > 1;

              return (
                <div
                  key={`${item.id}-${item.size}`}
                  className="flex gap-3 rounded-lg border border-border bg-card p-3 shadow-sm"
                >
                  <Link
                    href={`/product/${item.productId}`}
                    onClick={() => setCartOpen(false)}
                    className="relative h-20 w-16 flex-shrink-0 overflow-hidden rounded-md bg-muted"
                  >
                    <Image
                      src={getProductImageUrl(item.image)}
                      alt={item.name}
                      fill
                      sizes="64px"
                      className="object-cover"
                      unoptimized
                    />
                  </Link>

                  <div className="flex-1 min-w-0">
                    <Link
                      href={`/product/${item.productId}`}
                      onClick={() => setCartOpen(false)}
                      className="block truncate text-sm font-semibold text-foreground hover:text-primary"
                    >
                      {item.name}
                    </Link>

                    <div className="mt-1 flex items-center gap-2">
                      {canSwitchSize ? (
                        <select
                          aria-label={`Change size for ${item.name}`}
                          value={item.size}
                          disabled={busy}
                          onChange={(e) => {
                            const nextSize = e.target.value;
                            if (isCustomer) {
                              updateMutation.mutate({
                                itemId: item.id,
                                quantity: item.quantity,
                                size: nextSize,
                              });
                            } else {
                              updateGuestItem(item.id, item.quantity, nextSize);
                            }
                          }}
                          className="h-7 rounded border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          {item.availableSizes!.map((sz) => (
                            <option key={sz} value={sz}>
                              {formatSizeLabel(sz)}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          Fit: {formatSizeLabel(item.size)}
                        </span>
                      )}
                    </div>

                    <div className="mt-2 flex items-center justify-between gap-2">
                      <div className="flex items-center rounded border border-input">
                        <button
                          type="button"
                          disabled={item.quantity <= 1 || busy}
                          onClick={() => {
                            const nextQty = Math.max(1, item.quantity - 1);
                            if (isCustomer) {
                              updateMutation.mutate({ itemId: item.id, quantity: nextQty });
                            } else {
                              updateGuestItem(item.id, nextQty);
                            }
                          }}
                          className="h-7 w-7 text-xs hover:bg-muted disabled:opacity-40"
                          aria-label="Decrease quantity"
                        >
                          -
                        </button>
                        <span className="w-7 text-center text-xs font-semibold tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          disabled={atMax || busy}
                          onClick={() => {
                            const nextQty = item.quantity + 1;
                            if (isCustomer) {
                              updateMutation.mutate({ itemId: item.id, quantity: nextQty });
                            } else {
                              updateGuestItem(item.id, nextQty);
                            }
                          }}
                          className="h-7 w-7 text-xs hover:bg-muted disabled:opacity-40"
                          aria-label="Increase quantity"
                        >
                          +
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-primary tabular-nums">
                          {formatPrice(item.subtotal)}
                        </span>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            if (isCustomer) {
                              removeMutation.mutate(item.id);
                            } else {
                              removeGuestItem(item.id);
                              toast.success("Item removed from bag");
                            }
                          }}
                          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                          aria-label={`Remove ${item.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-border bg-[#F2EAE0]/70 p-5 space-y-3">
            <div className="space-y-1.5 text-sm tabular-nums">
              <div className="flex justify-between text-muted-foreground">
                <span>Subtotal</span>
                <span className="font-medium text-foreground">{formatPrice(subtotal)}</span>
              </div>
              {mrpSavings > 0 && (
                <div className="flex justify-between text-xs text-emerald-700">
                  <span>MRP Savings</span>
                  <span className="font-medium">{formatPrice(mrpSavings)}</span>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-2 text-base font-bold text-foreground">
                <span>Total</span>
                <span className="text-primary">{formatPrice(total)}</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Link
                href="/cart"
                onClick={() => setCartOpen(false)}
                className="inline-flex items-center justify-center rounded-md border border-input bg-background px-4 py-2.5 text-xs sm:text-sm font-semibold text-foreground hover:bg-muted transition-colors"
              >
                View Full Bag
              </Link>
              <Button
                className="bg-primary hover:bg-primary/90 text-primary-foreground text-xs sm:text-sm font-semibold"
                onClick={handleCheckout}
              >
                {isCustomer ? "Checkout" : "Sign In to Buy"}
              </Button>
            </div>
          </div>
        )}
      </aside>
    </div>
  );
}
