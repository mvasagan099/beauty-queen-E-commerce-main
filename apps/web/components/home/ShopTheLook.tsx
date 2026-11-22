"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api, cartApi } from "@/lib/api";
import { formatPrice, getProductImageUrl } from "@/lib/utils";
import { useAuthStore, useGuestCartStore, useUIStore } from "@/store";
import { Button } from "@/components/ui/button";
import { ShoppingBag, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";

interface LookItem {
  productId: number;
  name: string;
  price: number;
  image: string | null;
  category: string;
  defaultSize: string;
}

interface ShopTheLookBundle {
  id: string;
  title: string;
  occasion: string;
  description: string;
  discountPercent: number;
  originalTotal: number;
  bundlePrice: number;
  items: LookItem[];
}

const EDITORIAL_FALLBACK_LOOKS: ShopTheLookBundle[] = [
  {
    id: "atelier-wedding-edit",
    title: "The Kanjeevaram & Kumkum Edit",
    occasion: "Wedding & Reception",
    description: "Heirloom crimson silk weave styled with velvet matte kumkum lip pigment.",
    discountPercent: 10,
    originalTotal: 5748,
    bundlePrice: 5173,
    items: [
      {
        productId: 0,
        name: "Kanjeevaram Zari Silk Saree",
        price: 4999,
        image: "/images/editorial/saree.jpg",
        category: "saree",
        defaultSize: "FREE_SIZE",
      },
      {
        productId: 0,
        name: "Madras Kumkum Velvet Matte Lip",
        price: 749,
        image: "/images/editorial/cosmetics.jpg",
        category: "cosmetics",
        defaultSize: "FREE_SIZE",
      },
    ],
  },
  {
    id: "atelier-festive-trio",
    title: "The Silk-Cotton Festive Pairing",
    occasion: "Sangeet & Brunch",
    description: "Embroidered ivory-rose kurthi tailored to pair effortlessly with modal stretch leggings.",
    discountPercent: 10,
    originalTotal: 2598,
    bundlePrice: 2338,
    items: [
      {
        productId: 0,
        name: "Zari-Trim Embroidered Kurthi",
        price: 1899,
        image: "/images/editorial/kurthi.jpg",
        category: "kurthi",
        defaultSize: "M",
      },
      {
        productId: 0,
        name: "4-Way Stretch Modal Leggin",
        price: 699,
        image: "/images/editorial/leggin.jpg",
        category: "leggin",
        defaultSize: "M",
      },
    ],
  },
];

export function ShopTheLook() {
  const [addingLookId, setAddingLookId] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const addGuestItem = useGuestCartStore((s) => s.addItem);
  const setCartOpen = useUIStore((s) => s.setCartOpen);
  const isCustomer = !!user && user.role === "CUSTOMER";

  const { data } = useQuery<{ success: boolean; looks: ShopTheLookBundle[] }>({
    queryKey: ["shop-the-look-bundles"],
    queryFn: () => api.get("/growth/looks"),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const looks =
    data?.looks && data.looks.length > 0 ? data.looks : EDITORIAL_FALLBACK_LOOKS;

  const handleAddCompleteLook = async (look: ShopTheLookBundle) => {
    const liveItems = look.items.filter((i) => i.productId > 0);
    if (liveItems.length === 0) {
      toast.info("Explore the collection to pick your exact pieces");
      return;
    }

    setAddingLookId(look.id);
    try {
      for (const item of liveItems) {
        if (isCustomer) {
          await cartApi.add(item.productId, item.defaultSize || "FREE_SIZE", 1);
        } else {
          addGuestItem({
            productId: item.productId,
            name: item.name,
            price: item.price,
            mrp: null,
            image: item.image,
            size: item.defaultSize || "FREE_SIZE",
            quantity: 1,
            availableStock: 10,
            availableSizes: [item.defaultSize || "FREE_SIZE"],
          });
        }
      }
      if (isCustomer) {
        queryClient.invalidateQueries({ queryKey: ["cart"] });
      }
      toast.success(`Added "${look.title}" (${liveItems.length} pieces) to your bag`);
      setCartOpen(true);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Could not add bundle to bag");
    } finally {
      setAddingLookId(null);
    }
  };

  return (
    <section
      className="py-14 md:py-20 bg-[#FBF7F2] border-y border-border/60"
      aria-labelledby="shop-the-look-heading"
    >
      <div className="container-page">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-primary mb-2 flex items-center gap-1.5">
              <Sparkles className="h-3.5 w-3.5" />
              Curated Atelier Pairings
            </p>
            <h2
              id="shop-the-look-heading"
              className="font-display text-3xl sm:text-4xl font-semibold text-foreground"
            >
              Shop the Complete Look
            </h2>
          </div>
          <p className="text-sm text-muted-foreground max-w-md">
            Styled by our Chennai atelier — add every coordinating piece to your bag in one tap.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {looks.map((look) => {
            const hasLiveProducts = look.items.some((i) => i.productId > 0);
            const savings = Math.max(0, look.originalTotal - look.bundlePrice);
            return (
              <div
                key={look.id}
                className="rounded-2xl border border-border bg-card p-6 shadow-sm flex flex-col justify-between gap-5"
              >
                <div>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="inline-block rounded-full bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                        {look.occasion}
                      </span>
                      <h3 className="font-display text-2xl font-semibold text-foreground mt-2">
                        {look.title}
                      </h3>
                    </div>
                    {look.discountPercent > 0 && (
                      <span className="rounded-full bg-[#1A0B10] px-3 py-1 text-xs font-semibold text-[#D4A353] flex-shrink-0">
                        Save {look.discountPercent}%
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1.5">{look.description}</p>

                  <div className="mt-5 space-y-3">
                    {look.items.map((item, idx) => {
                      const imgSrc = item.image?.startsWith("/images/")
                        ? item.image
                        : getProductImageUrl(item.image);
                      return (
                        <div
                          key={`${look.id}-${idx}`}
                          className="flex items-center gap-3.5 rounded-xl border border-border/70 bg-background/60 p-2.5"
                        >
                          <img
                            src={imgSrc}
                            alt={item.name}
                            className="h-16 w-14 rounded-lg object-cover flex-shrink-0 bg-muted"
                          />
                          <div className="flex-1 min-w-0">
                            {item.productId > 0 ? (
                              <Link
                                href={`/product/${item.productId}`}
                                className="text-sm font-medium text-foreground hover:text-primary truncate block"
                              >
                                {item.name}
                              </Link>
                            ) : (
                              <Link
                                href={`/${item.category}`}
                                className="text-sm font-medium text-foreground hover:text-primary truncate block"
                              >
                                {item.name}
                              </Link>
                            )}
                            <p className="text-xs text-muted-foreground capitalize mt-0.5">
                              {item.category} · {item.defaultSize === "FREE_SIZE" ? "Free Size" : `Size ${item.defaultSize}`}
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-foreground">
                            {formatPrice(item.price)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-t border-border/70 pt-4">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-display text-2xl font-semibold text-primary">
                        {formatPrice(look.bundlePrice)}
                      </span>
                      {savings > 0 && (
                        <span className="text-sm text-muted-foreground line-through">
                          {formatPrice(look.originalTotal)}
                        </span>
                      )}
                    </div>
                    {savings > 0 && (
                      <p className="text-xs text-green-700 font-medium flex items-center gap-1">
                        <Check className="h-3.5 w-3.5" />
                        Bundle savings of {formatPrice(savings)}
                      </p>
                    )}
                  </div>

                  {hasLiveProducts ? (
                    <Button
                      onClick={() => handleAddCompleteLook(look)}
                      disabled={addingLookId === look.id}
                      className="bg-[#1A0B10] hover:bg-[#2D1B22] text-[#FBF7F2] gap-2"
                    >
                      <ShoppingBag className="h-4 w-4 text-[#D4A353]" />
                      {addingLookId === look.id ? "Adding..." : "Add Complete Look"}
                    </Button>
                  ) : (
                    <Link href={`/${look.items[0]?.category || "saree"}`}>
                      <Button className="bg-[#1A0B10] hover:bg-[#2D1B22] text-[#FBF7F2] gap-2">
                        <ShoppingBag className="h-4 w-4 text-[#D4A353]" />
                        Explore This Edit
                      </Button>
                    </Link>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
