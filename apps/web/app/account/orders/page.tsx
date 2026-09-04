"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ordersApi } from "@/lib/api";
import { Order } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatDate, getProductImageUrl } from "@/lib/utils";
import { LoadingPage } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { ShoppingBag, ArrowRight } from "lucide-react";

const statusVariant: Record<string, "default" | "success" | "warning" | "destructive" | "info" | "secondary"> = {
  Pending: "warning",
  Confirmed: "info",
  Processing: "info",
  Shipped: "default",
  "Out for Delivery": "default",
  Delivered: "success",
  Cancelled: "destructive",
  Refunded: "secondary",
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
    return <LoadingPage text="Loading your orders..." />;
  }

  if (isError) {
    return (
      <div className="page-container max-w-3xl">
        <h1 className="page-title">My Orders</h1>
        <EmptyState
          title="Failed to load orders"
          description="We couldn't load your orders. Please try again."
          action={
            <Link href="/account">
              <Button variant="outline">Back to Account</Button>
            </Link>
          }
        />
      </div>
    );
  }

  const orders = Array.isArray(data?.orders) ? data.orders : [];
  const totalPages = data?.pagination?.totalPages || 1;

  return (
    <div className="page-container max-w-3xl">
      <h1 className="page-title">My Orders</h1>

      {orders.length === 0 ? (
        <EmptyState
          icon={<ShoppingBag className="h-8 w-8" />}
          title="No orders yet"
          description="You haven't placed any orders. Start shopping to see your orders here."
          action={
            <Link href="/">
              <Button className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2">
                Start Shopping
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          }
        />
      ) : (
        <div className="space-y-4">
          {orders.map((order) => {
            const total =
              Number(order.totalAmount) ||
              Number(order.subtotal) ||
              Number(order.price) * Number(order.quantity) ||
              0;
            return (
              <Card key={order.id} className="card-hover">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex items-start gap-3 sm:gap-4">
                    {order.image ? (
                      <div className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                        <img
                          src={getProductImageUrl(order.image)}
                          alt={order.productName || order.name || ""}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <div className="h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 rounded-lg bg-muted flex items-center justify-center">
                        <ShoppingBag className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="font-medium text-foreground truncate text-sm sm:text-base">
                          {order.productName || order.name || `Order #${order.id}`}
                        </h3>
                        <p className="font-bold text-primary text-sm sm:text-base flex-shrink-0">
                          {formatPrice(total)}
                        </p>
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">
                        {order.size && `Size: ${order.size}`}
                        {order.size && order.quantity && " · "}
                        {order.quantity && `Qty: ${order.quantity}`}
                      </p>
                      {order.orderDate && (
                        <p className="text-xs sm:text-sm text-muted-foreground">
                          {formatDate(order.orderDate)}
                        </p>
                      )}
                      <div className="flex items-center gap-2 mt-2">
                        <Badge variant={statusVariant[order.status] || "secondary"}>
                          {order.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {order.paymentStatus === "COD" || order.paymentStatus === "PENDING_COD"
                            ? "Cash on Delivery"
                            : order.paymentStatus}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 pt-3 border-t">
                    <Link href={`/orders/${order.id}`}>
                      <Button variant="outline" size="sm" className="gap-1.5">
                        View Details
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-4">
              <Button
                variant="outline"
                size="sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <span className="text-sm text-muted-foreground">
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
