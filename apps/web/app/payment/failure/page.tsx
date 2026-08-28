"use client";

import { useRef, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { paymentsApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { PaymentStatusCard } from "@/components/payment/PaymentStatus";
import {
  RazorpayCheckout,
  RazorpayCheckoutHandle,
} from "@/components/payment/RazorpayCheckout";

export default function PaymentFailurePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const queryClient = useQueryClient();
  const razorpayRef = useRef<RazorpayCheckoutHandle>(null);
  const [retrying, setRetrying] = useState(false);
  const checkoutId = searchParams.get("checkoutId");
  const error = searchParams.get("error") || "Payment was not completed";

  const retryMutation = useMutation({
    mutationFn: async () => {
      if (!checkoutId) throw new Error("No checkout reference found");
      const res = await paymentsApi.retry(checkoutId);
      return res.data as {
        checkoutId: string;
        razorpayOrderId: string;
        amount: number;
        currency: string;
        keyId: string;
        attempt: number;
      };
    },
    onSuccess: async (data) => {
      setRetrying(true);
      try {
        await razorpayRef.current?.open({
          checkoutId: data.checkoutId,
          amountPaise: data.amount,
          keyId: data.keyId,
          orderId: data.razorpayOrderId,
        });
      } catch (err: unknown) {
        const message =
          err instanceof Error ? err.message : "Payment not completed";
        toast.error(message);
      } finally {
        setRetrying(false);
      }
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handlePaymentSuccess = (id: string) => {
    queryClient.invalidateQueries({ queryKey: ["cart"] });
    queryClient.invalidateQueries({ queryKey: ["payment-status"] });
    router.push(`/payment/success?checkoutId=${id}`);
  };

  const handlePaymentFailure = (_id: string, message: string) => {
    toast.error(message);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 py-8">
      <RazorpayCheckout
        ref={razorpayRef}
        onSuccess={handlePaymentSuccess}
        onFailure={handlePaymentFailure}
      />
      <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center">
        <svg
          className="h-10 w-10 text-red-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 18L18 6M6 6l12 12"
          />
        </svg>
      </div>
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Payment Failed
        </h1>
        <p className="text-gray-500 max-w-md">{error}.</p>
      </div>

      {checkoutId && <PaymentStatusCard checkoutId={checkoutId} />}

      <Card className="w-full max-w-md">
        <CardContent className="pt-6 space-y-3">
          <p className="text-xs text-gray-400">
            No amount has been charged unless the payment was already confirmed.
            Your cart items are still reserved while this checkout remains open.
            You can retry the payment below.
          </p>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        {checkoutId && (
          <Button
            className="bg-pink-500 hover:bg-pink-600 text-white"
            disabled={retrying}
            onClick={() => retryMutation.mutate()}
          >
            {retrying ? "Retrying..." : "Retry Payment"}
          </Button>
        )}
        <Link href="/checkout">
          <Button
            variant="outline"
            className="border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white"
          >
            Back to Checkout
          </Button>
        </Link>
      </div>
    </div>
  );
}