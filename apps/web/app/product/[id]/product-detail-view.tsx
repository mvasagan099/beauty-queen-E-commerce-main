"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { productsApi, cartApi, wishlistApi, alertsApi } from "@/lib/api";
import { Product } from "@/types";
import { formatPrice, getProductImageUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useAuthStore, useCheckoutStore } from "@/store";
import { Heart, Bell, BellOff } from "lucide-react";
import { toast } from "sonner";
import { RelatedProducts } from "@/components/product/RelatedProducts";
import { FrequentlyBoughtTogether } from "@/components/product/FrequentlyBoughtTogether";
import { RecentlyViewed } from "@/components/product/RecentlyViewed";
import { recordRecentlyViewed } from "@/lib/recently-viewed";
import { ProductReviews } from "@/components/review/product-reviews";
import { ReviewForm } from "@/components/review/review-form";

const sizeMap: { label: string; key: keyof Product; val: number | null }[] = [
  { label: "S", key: "sizeS", val: null },
  { label: "M", key: "sizeM", val: null },
  { label: "L", key: "sizeL", val: null },
  { label: "XL", key: "sizeXl", val: null },
  { label: "XXL", key: "sizeXxl", val: null },
];

interface ProductDetailViewProps {
  productId: number;
  initialData: {
    product: Product;
    sizes: string[];
    relatedProducts: {
      id: number;
      name: string | null;
      price: number;
      mrp: number | null;
      image: string | null;
      ptype: string | null;
    }[];
  };
}

export default function ProductDetailView({
  productId,
  initialData,
}: ProductDetailViewProps) {
  const id = productId;
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(0);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});
  const router = useRouter();
  const queryClient = useQueryClient();
  const setBuyNowItem = useCheckoutStore((s) => s.setBuyNowItem);
  const user = useAuthStore((s) => s.user);

  useEffect(() => {
    recordRecentlyViewed(productId);
  }, [productId]);

  const { data: product, isLoading, error } = useQuery<{
    product: Product;
    sizes: string[];
    relatedProducts: {
      id: number;
      name: string | null;
      price: number;
      mrp: number | null;
      image: string | null;
      ptype: string | null;
    }[];
  }>({
    queryKey: ["product", id],
    queryFn: () => productsApi.get(id),
    initialData,
    enabled: !!id,
  });

  const addToCartMutation = useMutation({
    mutationFn: () => cartApi.add(id, selectedSize, quantity),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["cart"] });
      router.push("/cart");
    },
  });

  const buyNowMutation = useMutation({
    mutationFn: async () => {
      const price = product?.product?.price || 0;
      const mrp = product?.product?.mrp ?? null;
      setBuyNowItem({
        productId: id,
        name: product?.product?.name || "Product",
        size: selectedSize,
        quantity,
        price,
        mrp,
        image: product?.product?.image || null,
        subtotal: price * quantity,
      });
    },
    onSuccess: () => {
      router.push("/checkout");
    },
  });

  const { data: wishlistData } = useQuery<{ items: { productId: number }[] }>({
    queryKey: ["wishlist"],
    queryFn: () => wishlistApi.list(),
    enabled: !!user,
    retry: false,
  });

  const inWishlist =
    wishlistData?.items?.some((i) => i.productId === id) ?? false;

const wishlistMutation = useMutation({
    mutationFn: () => wishlistApi.toggle(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["wishlist"] });
    },
  });

  const currentProduct = product?.product;
  const hasAnyStock =
    !!currentProduct &&
    ((currentProduct.quantity ?? 0) > 0 ||
      ["sizeS", "sizeM", "sizeL", "sizeXl", "sizeXxl"].some(
        (k) => (currentProduct[k as keyof Product] as number) > 0,
      ));
  const productOutOfStock = !!currentProduct && !hasAnyStock;
  const currentPrice = currentProduct?.price ?? 0;

  const { data: myAlertsData } = useQuery<{
    stockAlerts: { id: number; productId: number; status: string }[];
    priceAlerts: { id: number; productId: number; watchedPrice: number; status: string }[];
  }>({
    queryKey: ["my-alerts"],
    queryFn: () => alertsApi.list(),
    enabled: !!user,
    retry: false,
  });

  const stockAlertActive =
    !!user && productOutOfStock && (myAlertsData?.stockAlerts?.some((a) => a.productId === id) ?? false);
  const priceAlertActive =
    !!user && (myAlertsData?.priceAlerts?.some((a) => a.productId === id) ?? false);

  const stockAlertMutation = useMutation({
    mutationFn: () =>
      stockAlertActive ? alertsApi.cancelStockAlert(id) : alertsApi.createStockAlert(id, selectedSize || undefined),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["my-alerts"] });
      toast.success(
        res?.message || (stockAlertActive ? "Back-in-stock alert cancelled" : "We'll notify you when this is back in stock"),
      );
    },
    onError: (err: Error) => toast.error(err.message || "Could not update back-in-stock alert"),
  });

  const [priceAlertOpen, setPriceAlertOpen] = useState(false);
  const [priceTarget, setPriceTarget] = useState<string>("");

  const openPriceAlert = () => {
    setPriceTarget(String(currentPrice || ""));
    setPriceAlertOpen(true);
  };

  const priceAlertMutation = useMutation({
    mutationFn: (target: number) =>
      priceAlertActive ? alertsApi.cancelPriceAlert(id) : alertsApi.createPriceAlert(id, target),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["my-alerts"] });
      setPriceAlertOpen(false);
      const msg =
        res?.message ||
        (priceAlertActive ? "Price alert cancelled" : "We'll email you when the price drops at or below your target");
      toast.success(msg);
    },
    onError: (err: Error) => toast.error(err.message || "Could not update price alert"),
  });

  const getAvailableStock = () => {
    if (!product?.product) return 0;
    const p2 = product.product;
    if (selectedSize) {
      const size = sizeMap.find((s) => s.label === selectedSize);
      if (size) {
        const v = p2[size.key];
        return typeof v === "number" ? v : 0;
      }
    }
    return p2.quantity ?? 0;
  };

  const availableStock = getAvailableStock();
  const isLowStock = availableStock > 0 && availableStock <= 5;
  const isOutOfStock = availableStock <= 0;

  useEffect(() => {
    setQuantity((q) => Math.min(q, Math.max(availableStock, 1) || 1));
  }, [availableStock]);

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="aspect-square rounded-lg bg-gray-100 animate-pulse" />
          <div className="space-y-4">
            <div className="h-8 bg-gray-100 rounded animate-pulse w-3/4" />
            <div className="h-6 bg-gray-100 rounded animate-pulse w-1/4" />
            <div className="h-4 bg-gray-100 rounded animate-pulse w-full" />
            <div className="h-4 bg-gray-100 rounded animate-pulse w-2/3" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !product?.product) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <p className="text-gray-500 text-lg">Product not found.</p>
        <Button onClick={() => router.push("/")} className="bg-pink-500 hover:bg-pink-600 text-white">
          Back to Home
        </Button>
      </div>
    );
  }

  const p = product.product;
  const availableSizes = sizeMap.filter(
    (s) => p[s.key] != null && (p[s.key] as number) > 0
  );

  const images = [p.image, p.image1, p.image2, p.image3, p.image4].filter(Boolean);

  const handleImgError = (idx: number) => {
    setImgErrors((prev) => ({ ...prev, [idx]: true }));
  };

  const getImgSrc = (img: string | null | undefined, idx: number) => {
    if (imgErrors[idx]) return "https://placehold.co/600x800/fce7f3/ec4899?text=No+Image";
    return getProductImageUrl(img);
  };

  return (
    <div className="container-page py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        <div>
          <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-gray-100 mb-4">
            <Image
              src={getImgSrc(images[activeImage] || p.image, activeImage)}
              alt={p.name || "Product image"}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover"
              priority
              onError={() => handleImgError(activeImage)}
              unoptimized
            />
          </div>
          {images.length > 1 && (
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`relative h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                    activeImage === i
                      ? "border-primary ring-2 ring-primary/20"
                      : "border-gray-200 hover:border-primary/40"
                  }`}
                  aria-label={`View image ${i + 1}`}
                >
                  <Image
                    src={getImgSrc(img, i)}
                    alt=""
                    fill
                    sizes="80px"
                    className="object-cover"
                    onError={() => handleImgError(i)}
                    unoptimized
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">{p.name}</h1>
            {p.ptype && (
              <p className="text-sm text-muted-foreground mt-1 capitalize">{p.ptype}</p>
            )}
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {p.price != null && (
              <span className="text-2xl sm:text-3xl font-bold text-primary">
                {formatPrice(p.price)}
              </span>
            )}
            {p.mrp != null && p.mrp > (p.price ?? 0) && (
              <>
                <span className="text-lg text-muted-foreground line-through">
                  {formatPrice(p.mrp)}
                </span>
                <span className="rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-bold text-green-700">
                  {Math.round(((p.mrp - p.price!) / p.mrp) * 100)}% OFF
                </span>
              </>
            )}
          </div>

          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${
              isOutOfStock
                ? "bg-red-100 text-red-700"
                : isLowStock
                ? "bg-yellow-100 text-yellow-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {isOutOfStock
              ? "Out of Stock"
              : isLowStock
              ? `Only ${availableStock} left - order soon!`
              : "In Stock"}
          </span>

          {p.description && (
            <p className="text-muted-foreground leading-relaxed whitespace-pre-line">{p.description}</p>
          )}

          {availableSizes.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-foreground mb-3">
                Select Size {!selectedSize && availableSizes.length > 0 && <span className="text-destructive">*</span>}
              </h3>
              <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Product size">
                {availableSizes.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => setSelectedSize(s.label)}
                    role="radio"
                    aria-checked={selectedSize === s.label}
                    className={`h-10 min-w-[40px] rounded-lg border-2 px-4 text-sm font-medium transition-all ${
                      selectedSize === s.label
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border hover:border-primary/50 text-foreground"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
              {!selectedSize && (
                <p className="text-xs text-muted-foreground mt-1.5">Please select a size to continue</p>
              )}
            </div>
          )}

          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Quantity</h3>
            <div className="flex items-center gap-3">
              <div className="flex items-center rounded-lg border border-input">
                <button
                  onClick={() => setQuantity(Math.max(1, quantity - 1))}
                  className="h-10 w-10 flex items-center justify-center text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={quantity <= 1}
                  aria-label="Decrease quantity"
                >
                  -
                </button>
                <span className="w-12 text-center text-sm font-semibold tabular-nums" aria-live="polite">
                  {quantity}
                </span>
                <button
                  onClick={() => setQuantity(quantity + 1)}
                  className="h-10 w-10 flex items-center justify-center text-sm font-medium hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={quantity >= availableStock}
                  aria-label="Increase quantity"
                >
                  +
                </button>
              </div>
              {isLowStock && (
                <span className="text-xs text-yellow-600">{availableStock} available</span>
              )}
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground h-12 text-base"
              disabled={!selectedSize || addToCartMutation.isPending || isOutOfStock}
              onClick={() => addToCartMutation.mutate()}
            >
              {addToCartMutation.isPending ? "Adding..." : isOutOfStock ? "Out of Stock" : "Add to Cart"}
            </Button>
            <Button
              className="flex-1 bg-foreground hover:bg-foreground/90 text-background h-12 text-base"
              disabled={!selectedSize || buyNowMutation.isPending || isOutOfStock}
              onClick={() => buyNowMutation.mutate()}
            >
              {buyNowMutation.isPending ? "Processing..." : "Buy Now"}
            </Button>
            {user && (
              <Button
                variant="outline"
                className="h-12 w-12 px-0 flex-shrink-0"
                onClick={() => wishlistMutation.mutate()}
                aria-pressed={inWishlist}
                aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
                title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Heart
                  className={`h-5 w-5 ${inWishlist ? "fill-primary text-primary" : "text-muted-foreground"}`}
                />
              </Button>
            )}
          </div>

          {addToCartMutation.isError && (
            <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-sm text-destructive">Failed to add to cart. Please try again.</p>
            </div>
          )}

          {user && productOutOfStock && (
            <Button
              variant="outline"
              className="w-full sm:w-auto"
              onClick={() => stockAlertMutation.mutate()}
              disabled={stockAlertMutation.isPending}
            >
              <Bell className="h-4 w-4 mr-2" />
              {stockAlertMutation.isPending
                ? "Working..."
                : stockAlertActive
                ? "Cancel Back-in-Stock Alert"
                : "Notify Me When Back in Stock"}
            </Button>
          )}

          {user && (
            <div className="mt-1">
              {priceAlertOpen ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-muted-foreground">Email me when price drops to (₹):</span>
                  <input
                    type="number"
                    min={1}
                    value={priceTarget}
                    onChange={(e) => setPriceTarget(e.target.value)}
                    className="h-9 w-28 rounded-md border border-input bg-background px-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                    aria-label="Target price for alert"
                  />
                  <Button
                    size="sm"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground"
                    disabled={priceAlertMutation.isPending || !priceTarget || Number(priceTarget) < 1}
                    onClick={() => priceAlertMutation.mutate(Number(priceTarget))}
                  >
                    Save Alert
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setPriceAlertOpen(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-muted-foreground gap-1.5"
                  onClick={() => (priceAlertActive ? priceAlertMutation.mutate(currentPrice) : openPriceAlert())}
                  disabled={priceAlertMutation.isPending}
                >
                  <BellOff className="h-4 w-4" />
                  {priceAlertMutation.isPending
                    ? "Working..."
                    : priceAlertActive
                    ? "Cancel Price Drop Alert"
                    : "Get Price Drop Alert"}
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-12 md:mt-16">
        <RelatedProducts productId={productId} limit={4} />
      </div>

      <div className="mt-12">
        <FrequentlyBoughtTogether productId={productId} limit={4} />
      </div>

      <div className="mt-12">
        <RecentlyViewed limit={4} />
      </div>

      <div className="mt-12 md:mt-16">
        <h2 className="section-title mb-6">Customer Reviews</h2>
        {user && (
          <div className="mb-8 rounded-xl border p-6">
            <h3 className="text-base font-semibold text-foreground mb-4">Write a Review</h3>
            <ReviewForm
              productId={productId}
              onSuccess={() => queryClient.invalidateQueries({ queryKey: ["reviews", productId] })}
            />
          </div>
        )}
        <ProductReviews productId={productId} />
      </div>
    </div>
  );
}
