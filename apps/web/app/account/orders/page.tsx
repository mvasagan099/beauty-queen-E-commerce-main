"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ordersApi } from "@/lib/api";
import { Order } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice, formatDate, getProductImageUrl } from "@/lib/utils";

const statusColors: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-700",
  Confirmed: "bg-blue-100 text-blue-700",
  Processing: "bg-blue-100 text-blue-700",
  Shipped: "bg-purple-100 text-purple-700",
  "Out for Delivery": "bg-indigo-100 text-indigo-700",
  Delivered: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
  Refunded: "bg-gray-100 text-gray-700",
};

const paymentStatusColors: Record<string, string> = {
  PAID: "bg-green-100 text-green-700",
  CAPTURED: "bg-green-100 text-green-700",
  PENDING: "bg-yellow-100 text-yellow-700",
  FAILED: "bg-red-100 text-red-700",
  REFUNDED: "bg-gray-100 text-gray-700",
  COD: "bg-blue-100 text-blue-700",
  PENDING_COD: "bg-blue-100 text-blue-700",
};

interface OrdersResponse {
  success: boolean;
  orders: Order[];
  pagination?: { page: number; limit: number; total: number; totalPages: number };
}

export default function AccountOrdersPage() {
  const [page, setPage] = useState(1);
  const limit = 5;

  const { data, isLoading, isError } = useQuery<OrdersResponse>({
    queryKey: ["orders", page, limit],
    queryFn: () => ordersApi.list({ page, limit }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center gap-4 min-h-[40vh] justify-center">
        <p className="text-gray-500">
          We couldn&apos;t load your orders. Please try again.
        </p>
        <Link href="/account">
          <Button variant="outline">Back to Account</Button>
        </Link>
      </div>
    );
  }

  const orders = Array.isArray(data?.orders) ? data.orders : [];
  const totalPages = data?.pagination?.totalPages || 1;

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Orders</h1>

      {orders.length === 0 ? (
        <div className="flex flex-col items-center gap-4 min-h-[40vh] justify-center">
          <p className="text-gray-500">You have no orders yet.</p>
          <Link href="/">
            <Button className="bg-pink-500 hover:bg-pink-600 text-white">
              Start Shopping
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const total =
              Number(order.totalAmount) ||
              Number(order.subtotal) ||
              Number(order.price) * Number(order.quantity) ||
              0;
            return (
              <Card key={order.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    {order.image ? (
                      <div className="h-20 w-20 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
                        <img
                          src={getProductImageUrl(order.image)}
                          alt={order.productName || order.name || ""}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-20 w-20 flex-shrink-0 rounded-md bg-gray-100 flex items-center justify-center text-gray-300">
                        No image
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-gray-900 truncate">
                        {order.productName || order.name || `Order #${order.id}`}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {order.size && `Size: ${order.size}`}{" "}
                        {order.quantity && `Qty: ${order.quantity}`}
                      </p>
                      {order.orderDate && (
                        <p className="text-sm text-gray-500">
                          {formatDate(order.orderDate)}
                        </p>
                      )}
                    </div>
                    <div className="text-right">
                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
                          statusColors[order.status] || "bg-gray-100 text-gray-700"
                        }`}
                      >
                        {order.status}
                      </span>
                      <p className="mt-1 font-bold text-pink-500">
                        {formatPrice(total)}
                      </p>
                      <p
                        className={`text-xs font-medium ${
                          paymentStatusColors[order.paymentStatus] || "text-gray-500"
                        }`}
                      >
                        {order.paymentStatus === "COD" || order.paymentStatus === "PENDING_COD"
                          ? "Cash on Delivery"
                          : order.paymentStatus}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <Link href={`/orders/${order.id}`} className="inline-block">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white"
                      >
                        View Details
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <span className="text-sm text-gray-500">
                Page {page} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
