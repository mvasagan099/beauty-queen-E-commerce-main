"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Crown, Gift } from "lucide-react";
import { api, cartApi, paymentsApi, couponsApi } from "@/lib/api";
import { CartResponse } from "@/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useCheckoutStore } from "@/store";
import { CheckoutForm } from "@/components/checkout/CheckoutForm";
import { OrderSummary, OrderLineItem } from "@/components/checkout/OrderSummary";
import {
  RazorpayCheckout,
  RazorpayCheckoutHandle,
} from "@/components/payment/RazorpayCheckout";

const GIFT_WRAP_FEE = 49;

const checkoutSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Valid email is required"),
  phone: z
    .string()
    .regex(/^\d{10}$/, "Phone must be a 10-digit number"),
  address: z.string().min(5, "Address is required"),
  pincode: z
    .string()
    .regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit pincode"),
  district: z.string().min(1, "District is required"),
  landmark: z.string().optional(),
});

type CheckoutFormData = z.infer<typeof checkoutSchema>;

export default function CheckoutPage() {
  const [paymentMethod, setPaymentMethod] = useState<"upi" | "cod">("cod");
  const [isProcessing, setIsProcessing] = useState(false);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{ code: string; calculatedDiscount: number } | null>(null);
  const [couponError, setCouponError] = useState("");
  const [isApplyingCoupon, setIsApplyingCoupon] = useState(false);
  const [redeemPoints, setRedeemPoints] = useState(false);
  const [giftWrap, setGiftWrap] = useState(false);
  const [giftNote, setGiftNote] = useState("");
  const router = useRouter();
  const queryClient = useQueryClient();
  const razorpayRef = useRef<RazorpayCheckoutHandle>(null);
  const { mode, buyNowItem, clearCheckout } = useCheckoutStore();

  const { data: cartResponse, isLoading: cartLoading } = useQuery<{
    success: boolean;
    data: {
      items: CartResponse["items"];
      total: number;
      subtotal: number;
      discount: number;
      shipping: number;
      tax: number;
    };
  }>({
    queryKey: ["cart"],
    queryFn: () => cartApi.get(),
    enabled: mode === "cart",
  });

  const cartData = cartResponse?.data;

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<CheckoutFormData>({
    resolver: zodResolver(checkoutSchema),
  });

  const isBuyNowMode = mode === "buynow" && buyNowItem;

  const displayItems: OrderLineItem[] = isBuyNowMode
    ? [
        {
          id: buyNowItem.productId,
          name: buyNowItem.name,
          size: buyNowItem.size,
          quantity: buyNowItem.quantity,
          price: buyNowItem.price,
          image: buyNowItem.image,
          subtotal: buyNowItem.subtotal,
        },
      ]
    : (cartData?.items as OrderLineItem[]) || [];

  const displaySubtotal = isBuyNowMode
    ? buyNowItem!.subtotal
    : cartData?.subtotal || cartData?.total || 0;
  const displayDiscount = isBuyNowMode ? 0 : cartData?.discount || 0;
  const couponDiscountAmount = appliedCoupon?.calculatedDiscount || 0;

  const { data: loyaltyPreview } = useQuery<{
    success: boolean;
    availablePoints: number;
    redeemablePoints: number;
    discountInr: number;
    conversionLabel: string;
  }>({
    queryKey: ["loyalty-redemption-preview", displaySubtotal],
    queryFn: () =>
      api.post("/growth/loyalty/preview-redemption", { subtotal: displaySubtotal }),
    enabled: displaySubtotal > 0,
    retry: false,
  });

  const loyaltyDiscountAmount =
    redeemPoints && loyaltyPreview ? loyaltyPreview.discountInr : 0;
  const loyaltyPointsToUse =
    redeemPoints && loyaltyPreview ? loyaltyPreview.redeemablePoints : 0;
  const giftWrapFee = giftWrap ? GIFT_WRAP_FEE : 0;

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setIsApplyingCoupon(true);
    setCouponError("");
    try {
      const result = await couponsApi.validate(couponCode.trim(), displaySubtotal - displayDiscount);
      if (result.success) {
        setAppliedCoupon(result.coupon);
        setCouponError("");
      }
    } catch (err: unknown) {
      setCouponError(err instanceof Error ? err.message : "Invalid coupon");
      setAppliedCoupon(null);
    } finally {
      setIsApplyingCoupon(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode("");
    setCouponError("");
  };

  const handlePaymentSuccess = (checkoutId: string) => {
    clearCheckout();
    queryClient.invalidateQueries({ queryKey: ["cart"] });
    queryClient.invalidateQueries({ queryKey: ["payment-status"] });
    queryClient.invalidateQueries({ queryKey: ["loyalty-summary"] });
    router.push(`/payment/success?checkoutId=${checkoutId}`);
  };

  const handlePaymentFailure = (checkoutId: string, message: string) => {
    router.push(
      `/payment/failure?checkoutId=${checkoutId}&error=${encodeURIComponent(message)}`
    );
  };

  const onSubmit = async (formData: CheckoutFormData) => {
    setIsProcessing(true);
    try {
      const checkoutPayload: Parameters<typeof paymentsApi.createCheckout>[0] = {
        source: isBuyNowMode ? "buynow" : "cart",
        name: formData.name,
        email: formData.email,
        phone: formData.phone,
        address: formData.address,
        pincode: formData.pincode,
        district: formData.district,
        landmark: formData.landmark,
        paymentMethod,
        redeemPoints: redeemPoints && loyaltyDiscountAmount > 0,
        giftWrap,
        giftNote: giftWrap && giftNote.trim() ? giftNote.trim() : undefined,
      };

      if (appliedCoupon) {
        checkoutPayload.couponCode = appliedCoupon.code;
      }

      if (isBuyNowMode && buyNowItem) {
        checkoutPayload.buynowItem = {
          productId: buyNowItem.productId,
          size: buyNowItem.size,
          quantity: buyNowItem.quantity,
        };
      }

      const checkoutRes = await paymentsApi.createCheckout(checkoutPayload);
      const checkoutData = checkoutRes.data;

      if (paymentMethod === "cod") {
        await paymentsApi.confirmCod(checkoutData.checkoutId);
        handlePaymentSuccess(checkoutData.checkoutId);
        return;
      }

      if (!checkoutData.razorpayKeyId) {
        throw new Error("Online payments are not configured. Please use Cash on Delivery.");
      }

      await razorpayRef.current?.open({
        checkoutId: checkoutData.checkoutId,
        amountPaise: checkoutData.totalAmount * 100,
        keyId: checkoutData.razorpayKeyId,
        orderId: checkoutData.razorpayOrderId || undefined,
        prefill: {
          name: formData.name,
          email: formData.email,
          contact: formData.phone,
        },
        notes: {
          address: formData.address,
          pincode: formData.pincode,
        },
      });
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Payment failed. Please try again.";
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  if (cartLoading || (!isBuyNowMode && !cartData)) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (displayItems.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <p className="text-gray-500 mb-4">No items to checkout.</p>
          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => router.push("/")}
          >
            Continue Shopping
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <RazorpayCheckout
        ref={razorpayRef}
        onSuccess={handlePaymentSuccess}
        onFailure={handlePaymentFailure}
      />
      <h1 className="font-display text-3xl font-semibold text-foreground mb-8">Checkout</h1>
      <form
        onSubmit={handleSubmit(onSubmit)}
        className="grid grid-cols-1 lg:grid-cols-3 gap-8"
      >
        <div className="lg:col-span-2 space-y-6">
          <CheckoutForm
            register={register}
            setValue={setValue}
            errors={errors}
            paymentMethod={paymentMethod}
            onPaymentMethodChange={setPaymentMethod}
          />

          {/* Queen's Circle Points Redemption */}
          {loyaltyPreview && loyaltyPreview.availablePoints >= 10 && loyaltyPreview.discountInr > 0 && (
            <Card className="border-amber-200/80 bg-amber-50/40">
              <CardContent className="p-4 flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-amber-100 p-2 text-amber-700 mt-0.5">
                    <Crown className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Redeem Queen&apos;s Circle Rewards
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Use {loyaltyPreview.redeemablePoints} of your {loyaltyPreview.availablePoints} pts to save{" "}
                      <span className="font-semibold text-amber-800">₹{loyaltyPreview.discountInr}</span>{" "}
                      ({loyaltyPreview.conversionLabel})
                    </p>
                  </div>
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-medium cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={redeemPoints}
                    onChange={(e) => setRedeemPoints(e.target.checked)}
                    className="h-4 w-4 rounded border-amber-400 text-primary focus:ring-primary"
                  />
                  Apply
                </label>
              </CardContent>
            </Card>
          )}

          {/* Festive Silk Gift Wrap & Personal Note */}
          <Card>
            <CardContent className="p-4 space-y-3">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className="rounded-lg bg-primary/10 p-2 text-primary mt-0.5">
                    <Gift className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">
                      Festive Silk Gift Wrap (+₹{GIFT_WRAP_FEE})
                    </p>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Hand-wrapped in Kora silk pouch with zari ribbon &amp; printed greeting card.
                    </p>
                  </div>
                </div>
                <label className="inline-flex items-center gap-2 text-sm font-medium cursor-pointer flex-shrink-0">
                  <input
                    type="checkbox"
                    checked={giftWrap}
                    onChange={(e) => setGiftWrap(e.target.checked)}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                  Add
                </label>
              </div>
              {giftWrap && (
                <div>
                  <label htmlFor="gift-note" className="block text-xs font-medium text-muted-foreground mb-1">
                    Personal Gift Note (optional, max 240 chars)
                  </label>
                  <textarea
                    id="gift-note"
                    value={giftNote}
                    onChange={(e) => setGiftNote(e.target.value.slice(0, 240))}
                    rows={2}
                    placeholder="Wishing you joy and radiance on this special occasion..."
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        <div>
          <OrderSummary
            items={displayItems}
            subtotal={displaySubtotal}
            productDiscount={displayDiscount}
            couponCode={couponCode}
            couponDiscount={couponDiscountAmount}
            couponError={couponError}
            isApplyingCoupon={isApplyingCoupon}
            appliedCoupon={appliedCoupon}
            loyaltyDiscount={loyaltyDiscountAmount}
            redeemedPoints={loyaltyPointsToUse}
            giftWrapFee={giftWrapFee}
            isProcessing={isProcessing}
            paymentMethod={paymentMethod}
            onCouponCodeChange={setCouponCode}
            onApplyCoupon={handleApplyCoupon}
            onRemoveCoupon={handleRemoveCoupon}
          />
        </div>
      </form>
    </div>
  );
}
