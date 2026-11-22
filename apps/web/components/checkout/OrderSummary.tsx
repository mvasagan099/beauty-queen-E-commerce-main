"use client";

import Image from "next/image";
import { Tag, X } from "lucide-react";
import { formatPrice, getProductImageUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface OrderLineItem {
  id: number;
  name: string;
  size: string;
  quantity: number;
  price: number;
  image: string | null;
  subtotal?: number;
}

interface OrderSummaryProps {
  items: OrderLineItem[];
  subtotal: number;
  productDiscount: number;
  couponCode: string;
  couponDiscount: number;
  couponError: string;
  isApplyingCoupon: boolean;
  appliedCoupon: { code: string; calculatedDiscount: number } | null;
  loyaltyDiscount?: number;
  redeemedPoints?: number;
  giftWrapFee?: number;
  isProcessing: boolean;
  paymentMethod: "upi" | "cod";
  onCouponCodeChange: (value: string) => void;
  onApplyCoupon: () => void;
  onRemoveCoupon: () => void;
}

export function OrderSummary({
  items,
  subtotal,
  productDiscount,
  couponCode,
  couponDiscount,
  couponError,
  isApplyingCoupon,
  appliedCoupon,
  loyaltyDiscount = 0,
  redeemedPoints = 0,
  giftWrapFee = 0,
  isProcessing,
  paymentMethod,
  onCouponCodeChange,
  onApplyCoupon,
  onRemoveCoupon,
}: OrderSummaryProps) {
  const total = Math.max(
    0,
    subtotal - productDiscount - couponDiscount - loyaltyDiscount + giftWrapFee
  );

  return (
    <Card className="sticky top-24">
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <div
            key={`${item.id}-${item.size}`}
            className="flex items-center gap-3 text-sm"
          >
            <div className="relative h-12 w-12 flex-shrink-0 rounded overflow-hidden bg-gray-100">
              <Image
                src={getProductImageUrl(item.image)}
                alt={item.name}
                fill
                sizes="48px"
                className="object-cover"
                unoptimized
              />
            </div>
            <div className="flex-1 min-w-0">
              <p className="truncate">{item.name}</p>
              <p className="text-gray-500 text-xs">
                {item.size} x {item.quantity}
              </p>
            </div>
            <span className="font-medium">
              {formatPrice(item.subtotal || item.price * item.quantity)}
            </span>
          </div>
        ))}

        <div className="border-t pt-3">
          <div className="flex justify-between text-sm">
            <span>Subtotal</span>
            <span>{formatPrice(subtotal)}</span>
          </div>
          {productDiscount > 0 && (
            <div className="flex justify-between text-sm text-green-600">
              <span>Product Discount</span>
              <span>-{formatPrice(productDiscount)}</span>
            </div>
          )}

          <div className="flex items-center gap-2 mt-3">
            <Tag className="h-4 w-4 text-gray-400" />
            {appliedCoupon ? (
              <div className="flex items-center justify-between w-full">
                <span className="text-sm text-green-600 font-medium">
                  {appliedCoupon.code} (-{formatPrice(appliedCoupon.calculatedDiscount)})
                </span>
                <button type="button" onClick={onRemoveCoupon} className="text-red-500 hover:text-red-700">
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <div className="flex gap-2 w-full">
                <Input
                  placeholder="Coupon code"
                  value={couponCode}
                  onChange={(e) => onCouponCodeChange(e.target.value.toUpperCase())}
                  className="h-8 text-xs"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onApplyCoupon}
                  disabled={isApplyingCoupon || !couponCode.trim()}
                  className="h-8 text-xs"
                >
                  {isApplyingCoupon ? "..." : "Apply"}
                </Button>
              </div>
            )}
          </div>
          {couponError && <p className="text-xs text-red-500 mt-1">{couponError}</p>}

          {loyaltyDiscount > 0 && (
            <div className="flex justify-between text-sm text-amber-700 mt-2">
              <span>Queen&apos;s Circle ({redeemedPoints} pts)</span>
              <span>-{formatPrice(loyaltyDiscount)}</span>
            </div>
          )}
          {giftWrapFee > 0 && (
            <div className="flex justify-between text-sm text-foreground mt-1">
              <span>Festive Silk Gift Wrap</span>
              <span>+{formatPrice(giftWrapFee)}</span>
            </div>
          )}

          <div className="flex justify-between text-sm mt-1">
            <span>Shipping</span>
            <span className="text-green-600">Free</span>
          </div>
          <div className="flex justify-between text-sm">
            <span>Tax</span>
            <span>Included</span>
          </div>
          <div className="flex justify-between font-bold text-lg mt-3">
            <span>Total</span>
            <span className="text-primary">{formatPrice(total)}</span>
          </div>
        </div>
        <Button
          type="submit"
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mt-4"
          disabled={isProcessing || items.length === 0}
        >
          {isProcessing ? "Processing..." : paymentMethod === "cod" ? "Place Order" : "Pay Now"}
        </Button>
      </CardContent>
    </Card>
  );
}
