"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { paymentsApi } from "@/lib/api";
import { PaymentStatusCard, type PaymentStatusData } from "@/components/payment/PaymentStatus";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { CheckCircle, XCircle, Clock, ArrowRight } from "lucide-react";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();
  const checkoutId = searchParams.get("checkoutId");

  const { data, isLoading } = useQuery<{ data: PaymentStatusData }>({
    queryKey: ["payment-status", checkoutId],
    queryFn: () => paymentsApi.byCheckout(checkoutId!),
    enabled: !!checkoutId,
    retry: 3,
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status;
      if (status === "PENDING" || status === "AUTHORIZED") return 4000;
      return false;
    },
  });

  const payment = data?.data;
  const isBeingConfirmed = isLoading || !payment;
  const confirmed = payment && (payment.status === "CAPTURED" || payment.method === "cod");
  const failed = payment && payment.status === "FAILED";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 py-12">
      {isBeingConfirmed ? (
        <>
          <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
            <Spinner size="lg" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Confirming your order&hellip;
            </h1>
            <p className="text-muted-foreground max-w-md">
              Please wait while we confirm your payment. This may take a few moments.
              Do not close this page.
            </p>
          </div>
        </>
      ) : failed ? (
        <>
          <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
            <XCircle className="h-10 w-10 text-destructive" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Payment Failed
            </h1>
            <p className="text-muted-foreground max-w-md">
              We could not confirm your payment. No amount has been charged.
              You can retry from your checkout page.
            </p>
          </div>
        </>
      ) : confirmed ? (
        <>
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
            <CheckCircle className="h-10 w-10 text-green-600" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Order Placed Successfully!
            </h1>
            <p className="text-muted-foreground max-w-md">
              {payment.method === "cod"
                ? "Your order has been placed. You will pay in cash upon delivery."
                : "Your payment has been confirmed. You will receive an email confirmation shortly."}
            </p>
          </div>
        </>
      ) : (
        <>
          <div className="h-20 w-20 rounded-full bg-yellow-100 flex items-center justify-center">
            <Clock className="h-10 w-10 text-yellow-600" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              Checking your order
            </h1>
            <p className="text-muted-foreground max-w-md">
              Please wait while we verify your payment status.
            </p>
          </div>
        </>
      )}

      {payment && !isBeingConfirmed && <PaymentStatusCard checkoutId={checkoutId!} />}

      {!isBeingConfirmed && (
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/orders">
            <Button variant="outline" className="gap-2">
              View Orders
              <ArrowRight className="h-4 w-4" />
            </Button>
          </Link>
          <Link href="/">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
              Continue Shopping
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
