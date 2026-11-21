"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, ordersApi } from "@/lib/api";
import { Order } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatPrice, formatDate, getProductImageUrl } from "@/lib/utils";
import { LoadingPage } from "@/components/ui/spinner";
import { EmptyState } from "@/components/ui/empty-state";
import { ShoppingBag, ArrowRight, Layers, List } from "lucide-react";

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

interface OrderGroup {
  groupId: string;
  checkoutId: string | null;
  orderDate: string | null;
  paymentMethod: string | null;
  paymentStatus: string;
  overallStatus: string;
  itemCount: number;
  totalAmount: number;
  items: Order[];
}

interface GroupedOrdersResponse {
  success: boolean;
  groups: OrderGroup[];
}

export default function AccountOrdersPage() {
  const [viewMode, setViewMode] = useState<"grouped" | "items">("grouped");
  const [page, setPage] = useState(1);
  const limit = 5;

  const { data, isLoading, isError } = useQuery<OrdersResponse>({
    queryKey: ["orders", page, limit],
    queryFn: () => ordersApi.list({ page, limit }),
    enabled: viewMode === "items",
  });

  const {
    data: groupedData,
    isLoading: groupedLoading,
    isError: groupedError,
  } = useQuery<GroupedOrdersResponse>({
    queryKey: ["orders-grouped"],
    queryFn: () => api.get("/orders/grouped"),
    enabled: viewMode === "grouped",
  });

  const loading = viewMode === "grouped" ? groupedLoading : isLoading;
  const error = viewMode === "grouped" ? groupedError : isError;

  if (loading) {
    return <LoadingPage text="Loading your orders..." />;
  }

  if (error) {
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
  const groups = Array.isArray(groupedData?.groups) ? groupedData.groups : [];
  const totalPages = data?.pagination?.totalPages || 1;
  const isEmpty = viewMode === "grouped" ? groups.length === 0 : orders.length === 0;

  return (
    <div className="page-container max-w-3xl">
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <h1 className="page-title mb-0">My Orders</h1>
        <div className="inline-flex rounded-lg border border-input bg-card p-1">
          <button
            type="button"
            onClick={() => setViewMode("grouped")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "grouped"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Layers className="h-3.5 w-3.5" />
            Grouped Orders
          </button>
          <button
            type="button"
            onClick={() => setViewMode("items")}
            className={`inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              viewMode === "items"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <List className="h-3.5 w-3.5" />
            Individual Items
          </button>
        </div>
      </div>

      {isEmpty ? (
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
      ) : viewMode === "grouped" ? (
        <div className="space-y-5">
          {groups.map((group) => (
            <Card key={group.groupId} className="overflow-hidden border-border/80">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b bg-muted/40 px-4 py-3 text-xs sm:text-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold text-foreground">{group.groupId}</span>
                  {group.orderDate && (
                    <span className="text-muted-foreground">
                      · {formatDate(group.orderDate)}
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    · {group.itemCount} item{group.itemCount === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={statusVariant[group.overallStatus] || "secondary"}>
                    {group.overallStatus}
                  </Badge>
                  <span className="font-bold text-primary tabular-nums">
                    {formatPrice(group.totalAmount)}
                  </span>
                </div>
              </div>
              <CardContent className="divide-y p-0">
                {group.items.map((item) => {
                  const lineTotal =
                    Number(item.subtotal) ||
                    Number(item.price) * Number(item.quantity) ||
                    0;
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 p-4 hover:bg-muted/20 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.image ? (
                          <div className="h-14 w-14 flex-shrink-0 rounded-md overflow-hidden bg-muted">
                            <img
                              src={getProductImageUrl(item.image)}
                              alt={item.productName || item.name || ""}
                              className="h-full w-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-14 w-14 flex-shrink-0 rounded-md bg-muted flex items-center justify-center">
                            <ShoppingBag className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate text-sm">
                            {item.productName || item.name || `Order #${item.id}`}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {item.size && `Fit: ${item.size === "FREE_SIZE" ? "Free Size" : item.size}`}
                            {item.size && item.quantity && " · "}
                            {item.quantity && `Qty: ${item.quantity}`}
                            {" · "}
                            <span className="font-medium text-foreground tabular-nums">
                              {formatPrice(lineTotal)}
                            </span>
                          </p>
                        </div>
                      </div>
                      <Link href={`/orders/${item.id}`} className="flex-shrink-0">
                        <Button variant="outline" size="sm" className="text-xs">
                          Track / Manage
                        </Button>
                      </Link>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          ))}
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
                        {order.size && `Size: ${order.size === "FREE_SIZE" ? "Free Size" : order.size}`}
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
