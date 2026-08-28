"use client";

import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface CartSummaryProps {
  itemCount: number;
  subtotal: number;
  discount: number;
  shipping: number;
  tax: number;
  total: number;
  onCheckout: () => void;
}

export function CartSummary({
  itemCount,
  subtotal,
  discount,
  shipping,
  tax,
  total,
  onCheckout,
}: CartSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span>Subtotal ({itemCount} items)</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Discount</span>
            <span>-{formatPrice(discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span>Shipping</span>
          <span className="text-green-600">
            {shipping === 0 ? "Free" : formatPrice(shipping)}
          </span>
        </div>
        {tax > 0 && (
          <div className="flex justify-between text-sm">
            <span>Tax</span>
            <span>{formatPrice(tax)}</span>
          </div>
        )}
        <div className="border-t pt-3 flex justify-between font-bold text-lg">
          <span>Total</span>
          <span className="text-pink-500">{formatPrice(total)}</span>
        </div>
        <Button
          className="w-full bg-pink-500 hover:bg-pink-600 text-white mt-4"
          onClick={onCheckout}
        >
          Proceed to Checkout
        </Button>
      </CardContent>
    </Card>
  );
}
