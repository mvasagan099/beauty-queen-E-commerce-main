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
import { XCircle, RotateCcw, ArrowLeft, Loader2, AlertTriangle } from "lucide-react";

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
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 py-12">
      <RazorpayCheckout
        ref={razorpayRef}
        onSuccess={handlePaymentSuccess}
        onFailure={handlePaymentFailure}
      />
      <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
        <XCircle className="h-10 w-10 text-destructive" />
      </div>
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Payment Failed
        </h1>
        <p className="text-muted-foreground max-w-md">{error}. No amount has been charged.</p>
      </div>

      {checkoutId && <PaymentStatusCard checkoutId={checkoutId} />}

      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm text-muted-foreground leading-relaxed">
              <p>
                Your cart items are still reserved. You can retry the payment
                below or return to checkout to make changes.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3">
        {checkoutId && (
          <Button
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
            disabled={retrying}
            onClick={() => retryMutation.mutate()}
          >
            {retrying ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Retrying...
              </>
            ) : (
              <>
                <RotateCcw className="h-4 w-4" />
                Retry Payment
              </>
            )}
          </Button>
        )}
        <Link href="/checkout">
          <Button variant="outline" className="gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Checkout
          </Button>
        </Link>
      </div>
    </div>
  );
}
