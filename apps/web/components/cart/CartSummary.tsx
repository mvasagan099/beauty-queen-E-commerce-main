"use client";

import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ShieldCheck } from "lucide-react";

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
    <Card className="sticky top-24">
      <CardHeader className="pb-4">
        <CardTitle className="text-lg">Order Summary</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Subtotal ({itemCount} {itemCount === 1 ? "item" : "items"})</span>
          <span className="font-medium">{formatPrice(subtotal)}</span>
        </div>
        {discount > 0 && (
          <div className="flex justify-between text-sm text-green-600">
            <span>Discount</span>
            <span className="font-medium">-{formatPrice(discount)}</span>
          </div>
        )}
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Shipping</span>
          <span className="text-green-600 font-medium">
            {shipping === 0 ? "Free" : formatPrice(shipping)}
          </span>
        </div>
        {tax > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tax</span>
            <span className="font-medium">{formatPrice(tax)}</span>
          </div>
        )}
        <Separator />
        <div className="flex justify-between font-bold text-lg">
          <span>Total</span>
          <span className="text-primary">{formatPrice(total)}</span>
        </div>
        <Button
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground mt-2"
          onClick={onCheckout}
          size="lg"
        >
          Proceed to Checkout
        </Button>
        <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground pt-1">
          <ShieldCheck className="h-3.5 w-3.5" />
          <span>Secure checkout</span>
        </div>
      </CardContent>
    </Card>
  );
}
