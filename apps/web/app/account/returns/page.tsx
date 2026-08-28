"use client";

import { useQuery } from "@tanstack/react-query";
import { returnsApi } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { ReturnRequest, Refund } from "@/types";

const returnStatusColors: Record<string, string> = {
  REQUESTED: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-blue-100 text-blue-700",
  REJECTED: "bg-red-100 text-red-700",
  PICKUP_PENDING: "bg-purple-100 text-purple-700",
  RECEIVED: "bg-indigo-100 text-indigo-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-700",
};

export default function AccountReturnsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["my-returns"],
    queryFn: () => returnsApi.list(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
      </div>
    );
  }

  const returns: any[] = data?.returns || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Returns</h1>

      {returns.length === 0 ? (
        <div className="flex flex-col items-center gap-4 min-h-[40vh] justify-center">
          <p className="text-gray-500">No return requests found.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {returns.map((ret: ReturnRequest) => (
            <Card key={ret.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-medium text-gray-900">
                      Return #{ret.id} - Order #{ret.orderId}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1">
                      {ret.order?.product?.name || "Product"}
                    </p>
                    <p className="text-sm text-gray-500">
                      Reason: {ret.reason}
                    </p>
                    {ret.note && (
                      <p className="text-sm text-gray-400">Note: {ret.note}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      Requested: {new Date(ret.requestedAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                      returnStatusColors[ret.status] || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {ret.status.replace(/_/g, " ")}
                  </span>
                </div>
                {ret.refunds && ret.refunds.length > 0 && (
                  <div className="mt-3 border-t pt-3">
                    <p className="text-sm font-medium text-gray-700">Refund</p>
                    {ret.refunds.map((refund: Refund) => (
                      <div key={refund.id} className="flex items-center gap-2 text-sm">
                        <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          refund.status === "COMPLETED" ? "bg-green-100 text-green-700" :
                          refund.status === "FAILED" ? "bg-red-100 text-red-700" :
                          "bg-yellow-100 text-yellow-700"
                        }`}>
                          {refund.status}
                        </span>
                        <span>{formatPrice(Number(refund.amount))}</span>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
