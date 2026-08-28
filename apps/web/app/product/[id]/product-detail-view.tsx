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
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {/* Images */}
        <div>
          <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 mb-4">
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
            <div className="flex gap-2 overflow-x-auto pb-2">
              {images.map((img, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(i)}
                  className={`relative h-20 w-20 flex-shrink-0 rounded-md overflow-hidden border-2 transition-colors ${
                    activeImage === i
                      ? "border-pink-500"
                      : "border-gray-200 hover:border-pink-300"
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

        {/* Details */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{p.name}</h1>
          <div className="mt-4 flex items-center gap-4">
            {p.price != null && (
              <span className="text-3xl font-bold text-pink-500">
                {formatPrice(p.price)}
              </span>
            )}
            {p.mrp != null && p.mrp > (p.price ?? 0) && (
              <span className="text-xl text-gray-400 line-through">
                {formatPrice(p.mrp)}
              </span>
            )}
          </div>

          {p.mrp != null && p.price != null && p.mrp > p.price && (
            <span className="mt-2 inline-block rounded bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
              {Math.round(((p.mrp - p.price) / p.mrp) * 100)}% OFF
            </span>
          )}

          <span
            className={`mt-2 inline-block rounded px-3 py-1 text-sm font-medium ${
              isOutOfStock
                ? "bg-red-100 text-red-700"
                : isLowStock
                ? "bg-amber-100 text-amber-700"
                : "bg-green-100 text-green-700"
            }`}
          >
            {isOutOfStock
              ? "Out of Stock"
              : isLowStock
              ? `Only ${availableStock} left in stock`
              : "In Stock"}
          </span>

          {p.description && (
            <p className="mt-4 text-gray-600 whitespace-pre-line">{p.description}</p>
          )}

          {/* Sizes */}
          {availableSizes.length > 0 && (
            <div className="mt-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                Select Size
              </h3>
              <div className="flex gap-2" role="radiogroup" aria-label="Product size">
                {availableSizes.map((s) => (
                  <button
                    key={s.label}
                    onClick={() => setSelectedSize(s.label)}
                    role="radio"
                    aria-checked={selectedSize === s.label}
                    className={`h-10 min-w-[40px] rounded-md border px-3 text-sm font-medium transition-colors ${
                      selectedSize === s.label
                        ? "border-pink-500 bg-pink-500 text-white"
                        : "border-gray-300 hover:border-pink-500"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Quantity */}
          <div className="mt-6">
            <h3 className="text-sm font-semibold text-gray-700 mb-2">
              Quantity
            </h3>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setQuantity(Math.max(1, quantity - 1))}
                className="h-10 w-10 rounded-md border border-gray-300 text-lg font-medium hover:bg-gray-50 disabled:opacity-50"
                disabled={quantity <= 1}
                aria-label="Decrease quantity"
              >
                -
              </button>
              <span className="w-10 text-center font-medium" aria-live="polite">
                {quantity}
              </span>
              <button
                onClick={() => setQuantity(quantity + 1)}
                className="h-10 w-10 rounded-md border border-gray-300 text-lg font-medium hover:bg-gray-50 disabled:opacity-50"
                disabled={quantity >= availableStock}
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-8 flex flex-col sm:flex-row gap-3">
            <Button
              className="flex-1 bg-pink-500 hover:bg-pink-600 text-white"
              disabled={!selectedSize || addToCartMutation.isPending || isOutOfStock}
              onClick={() => addToCartMutation.mutate()}
            >
              {addToCartMutation.isPending ? "Adding..." : isOutOfStock ? "Out of Stock" : "Add to Cart"}
            </Button>
            <Button
              className="flex-1 bg-gray-900 hover:bg-gray-800 text-white"
              disabled={!selectedSize || buyNowMutation.isPending || isOutOfStock}
              onClick={() => buyNowMutation.mutate()}
            >
              {buyNowMutation.isPending ? "Processing..." : "Buy Now"}
            </Button>
            {user && (
              <Button
                variant="outline"
                className="px-3"
                onClick={() => wishlistMutation.mutate()}
                aria-pressed={inWishlist}
                aria-label={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
                title={inWishlist ? "Remove from wishlist" : "Add to wishlist"}
              >
                <Heart
                  className={`h-5 w-5 ${inWishlist ? "fill-pink-500 text-pink-500" : "text-gray-500"}`}
                />
              </Button>
            )}
          </div>

          {user && productOutOfStock && (
            <Button
              variant="outline"
              className="mt-4 w-full sm:w-auto"
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
            <div className="mt-3">
              {priceAlertOpen ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-gray-600">Email me when price is at or below &nbsp;(₹):</span>
                  <input
                    type="number"
                    min={1}
                    value={priceTarget}
                    onChange={(e) => setPriceTarget(e.target.value)}
                    className="h-9 w-28 rounded-md border border-gray-300 px-2 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500"
                    aria-label="Target price for alert"
                  />
                  <Button
                    size="sm"
                    className="bg-pink-500 hover:bg-pink-600 text-white"
                    disabled={priceAlertMutation.isPending || !priceTarget || Number(priceTarget) < 1}
                    onClick={() => priceAlertMutation.mutate(Number(priceTarget))}
                  >
                    Save Alert
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setPriceAlertOpen(false)}>
                    Cancel
                  </Button>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => (priceAlertActive ? priceAlertMutation.mutate(currentPrice) : openPriceAlert())}
                  disabled={priceAlertMutation.isPending}
                >
                  <BellOff className="h-4 w-4 mr-2" />
                  {priceAlertMutation.isPending
                    ? "Working..."
                    : priceAlertActive
                    ? "Cancel Price Drop Alert"
                    : "Get Price Drop Alert"}
                </Button>
              )}
            </div>
          )}

          {addToCartMutation.isError && (
            <p className="mt-2 text-sm text-red-500">
              Failed to add to cart. Please try again.
            </p>
          )}

          {!selectedSize && availableSizes.length > 0 && (
            <p className="mt-2 text-sm text-gray-500">
              Please select a size to continue
            </p>
          )}
        </div>
      </div>

      {/* Related Products */}
      <RelatedProducts productId={productId} limit={4} />

      {/* Frequently Bought Together */}
      <FrequentlyBoughtTogether productId={productId} limit={4} />

      {/* Recently Viewed */}
      <RecentlyViewed limit={4} />

      {/* Reviews */}
      <div className="mt-16">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Customer Reviews</h2>
        {user && (
          <div className="mb-8 rounded-lg border border-gray-200 p-6">
            <h3 className="text-base font-semibold text-gray-800 mb-4">Write a Review</h3>
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
