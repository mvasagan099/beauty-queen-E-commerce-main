"use client";

import { useState } from "react";
import { useSellerOrders, useUpdateSellerOrderStatus } from "@/hooks/use-orders";
import type { Order } from "@/types";
import { formatPrice, getProductImageUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const statusOptions = [
  "Pending",
  "Confirmed",
  "Processing",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

const statusColors: Record<string, string> = {
  Pending: "bg-yellow-100 text-yellow-700",
  Confirmed: "bg-blue-100 text-blue-700",
  Processing: "bg-indigo-100 text-indigo-700",
  Shipped: "bg-purple-100 text-purple-700",
  "Out for Delivery": "bg-cyan-100 text-cyan-700",
  Delivered: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
  Refunded: "bg-orange-100 text-orange-700",
};

export default function SellerOrdersPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingCancel, setPendingCancel] = useState<Order | null>(null);

  const { data, isLoading, isError } = useSellerOrders({
    page,
    limit: 20,
    status: statusFilter || undefined,
    search: searchQuery || undefined,
  });

  const updateStatusMutation = useUpdateSellerOrderStatus();

  const orders: Order[] = data?.data || [];
  const pagination = data?.pagination;

  const handleStatusChange = (order: Order, status: string) => {
    if (status === "Cancelled") {
      setPendingCancel(order);
      return;
    }
    updateStatusMutation.mutate({ id: order.id, status });
  };

  const confirmCancel = () => {
    if (pendingCancel) {
      updateStatusMutation.mutate({ id: pendingCancel.id, status: "Cancelled" });
      setPendingCancel(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Order Management</h1>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Input
          type="text"
          placeholder="Search orders..."
          value={searchQuery}
          onChange={(e) => {
            setSearchQuery(e.target.value);
            setPage(1);
          }}
          className="sm:w-64"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value);
            setPage(1);
          }}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All Status</option>
          {statusOptions.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
        </div>
      ) : isError ? (
        <p className="text-gray-500 text-center py-8">Unable to load orders.</p>
      ) : orders.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No orders found.</p>
      ) : (
        <>
          <div className="space-y-3">
            {orders.map((order) => (
              <Card key={order.id}>
                <CardContent className="p-4">
                  <div className="flex items-center gap-4">
                    <div className="h-16 w-16 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                      <img
                        src={getProductImageUrl(order.product?.image || order.image)}
                        alt={order.product?.name || order.name || ""}
                        className="h-full w-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-900 truncate">
                          {order.product?.name || order.name || `Order #${order.id}`}
                        </span>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            statusColors[order.status] || "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {order.status}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500">
                        #{order.id} | {order.username || order.email} | Size: {order.size || "N/A"} | Qty: {order.quantity}
                      </p>
                      <p className="text-sm text-gray-500">
                        {order.address}, {order.district} - {order.pincode}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-pink-500">
                        {formatPrice(Number(order.subtotal || order.price) || 0)}
                      </p>
                      <p className="text-xs text-gray-500">
                        {order.orderDate
                          ? new Date(order.orderDate).toLocaleDateString("en-IN")
                          : ""}
                      </p>
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order, e.target.value)}
                        className="mt-2 h-8 rounded border border-input bg-background px-2 text-xs"
                      >
                        {statusOptions.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {pagination && pagination.totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
              >
                Previous
              </Button>
              <span className="text-sm text-gray-600 px-4">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage((p) => Math.min(pagination.totalPages, p + 1))}
                disabled={page === pagination.totalPages}
              >
                Next
              </Button>
            </div>
          )}
        </>
      )}

      <ConfirmDialog
        open={!!pendingCancel}
        onOpenChange={(open) => {
          if (!open) setPendingCancel(null);
        }}
        title="Cancel this order?"
        description={
          pendingCancel
            ? `Are you sure you want to cancel order #${pendingCancel.id}? This action cannot be undone.`
            : undefined
        }
        confirmLabel="Cancel Order"
        destructive
        isLoading={updateStatusMutation.isPending}
        onConfirm={confirmCancel}
      />
    </div>
  );
}
