"use client";

import { useQuery } from "@tanstack/react-query";
import { paymentsApi } from "@/lib/api";
import { formatPrice, formatPaise } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

type PaymentStatusValue =
  | "PENDING"
  | "AUTHORIZED"
  | "CAPTURED"
  | "FAILED"
  | "REFUNDED"
  | "PARTIALLY_REFUNDED";

export interface PaymentStatusData {
  id: number;
  checkoutId: string;
  status: PaymentStatusValue;
  amount: number;
  currency: string;
  method?: string | null;
  createdAt: string;
  orders: Array<{
    id: number;
    name: string;
    status: string;
    paymentStatus: string;
    subtotal: number;
  }>;
}

const statusLabel: Record<PaymentStatusValue, string> = {
  PENDING: "Pending",
  AUTHORIZED: "Authorized",
  CAPTURED: "Confirmed",
  FAILED: "Failed",
  REFUNDED: "Refunded",
  PARTIALLY_REFUNDED: "Partially Refunded",
};

const statusColor: Record<PaymentStatusValue, string> = {
  PENDING: "text-yellow-600",
  AUTHORIZED: "text-blue-600",
  CAPTURED: "text-green-600",
  FAILED: "text-red-600",
  REFUNDED: "text-gray-600",
  PARTIALLY_REFUNDED: "text-gray-600",
};

/**
 * Displays the authoritative payment status for a checkout as returned by the
 * backend. Polls a few times while payment is still being confirmed so the
 * user always sees the final state.
 */
export function PaymentStatusCard({
  checkoutId,
}: {
  checkoutId: string;
}) {
  const { data, isLoading } = useQuery<{ data: PaymentStatusData }>({
    queryKey: ["payment-status", checkoutId],
    queryFn: () => paymentsApi.byCheckout(checkoutId),
    enabled: !!checkoutId,
    retry: 3,
    refetchInterval: (query) => {
      const status = query.state.data?.data?.status;
      if (status === "PENDING" || status === "AUTHORIZED") return 4000;
      return false;
    },
  });

  const payment = data?.data;

  if (isLoading && !payment) {
    return (
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <div className="flex items-center justify-center py-4">
            <span className="text-sm text-gray-500">
              Checking payment status&hellip;
            </span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!payment) return null;

  const Method = payment.method === "cod" ? "Cash on Delivery" : "Online";

  return (
    <Card className="w-full max-w-md">
      <CardContent className="pt-6 space-y-3">
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Order Reference</span>
          <span className="font-mono text-xs">{payment.checkoutId.slice(0, 8)}...</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Payment Status</span>
          <span className={`font-medium ${statusColor[payment.status]}`}>
            {statusLabel[payment.status]}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Amount</span>
          <span className="font-medium">
            {formatPaise(payment.amount, payment.currency)}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-500">Method</span>
          <span>{Method}</span>
        </div>
        {payment.orders.length > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Order ID(s)</span>
            <span className="font-mono text-xs">
              #{payment.orders.map((o) => o.id).join(", #")}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}