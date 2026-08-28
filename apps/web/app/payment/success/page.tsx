"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { paymentsApi } from "@/lib/api";
import { PaymentStatusCard, type PaymentStatusData } from "@/components/payment/PaymentStatus";
import { Button } from "@/components/ui/button";

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

  const confirmed =
    payment && (payment.status === "CAPTURED" || payment.method === "cod");

  const failed = payment && payment.status === "FAILED";

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 py-8">
      {isBeingConfirmed ? (
        <>
          <div className="h-20 w-20 rounded-full bg-gray-100 flex items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Confirming your order&hellip;
            </h1>
            <p className="text-gray-500 max-w-md">
              Please wait while we confirm your payment with the payment
              provider. This may take a few moments.
            </p>
          </div>
        </>
      ) : failed ? (
        <>
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
            <p className="text-gray-500 max-w-md">
              We could not confirm your payment. You can retry your payment
              from the checkout page.
            </p>
          </div>
        </>
      ) : confirmed ? (
        <>
          <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
            <svg
              className="h-10 w-10 text-green-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Order Placed Successfully!
            </h1>
            <p className="text-gray-500 max-w-md">
              {payment.method === "cod"
                ? "Your order has been placed. You will pay in cash upon delivery."
                : "Your order has been placed and payment has been confirmed. You will receive an email confirmation shortly."}
            </p>
          </div>
        </>
      ) : (
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Checking your order
          </h1>
        </div>
      )}

      {payment && !isBeingConfirmed && <PaymentStatusCard checkoutId={checkoutId!} />}

      {!isBeingConfirmed && (
        <div className="flex gap-3">
          <Link href="/orders">
            <Button
              variant="outline"
              className="border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white"
            >
              View Orders
            </Button>
          </Link>
          <Link href="/">
            <Button className="bg-pink-500 hover:bg-pink-600 text-white">
              Continue Shopping
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}