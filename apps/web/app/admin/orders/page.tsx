"use client";

import { useState } from "react";
import Link from "next/link";
import { useAdminOrders, useUpdateAdminOrderStatus } from "@/hooks/use-orders";
import type { Order } from "@/types";
import { formatPrice } from "@/lib/utils";
import { SearchBar, FilterBar, Pagination, StatusBadge } from "@/components/dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

const statusOptions = [
  "Pending",
  "Confirmed",
  "Processing",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
  "Refunded",
];

const orderStatuses = statusOptions.map((s) => ({ value: s, label: s }));

export default function AdminOrdersPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingCancel, setPendingCancel] = useState<Order | null>(null);

  const { data, isLoading, isError } = useAdminOrders({
    page,
    limit: 20,
    status: statusFilter || undefined,
    search: searchQuery || undefined,
  });

  const updateStatusMutation = useUpdateAdminOrderStatus();

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
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Order Management</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <SearchBar
          value={searchQuery}
          onChange={(v) => {
            setSearchQuery(v);
            setPage(1);
          }}
          placeholder="Search orders..."
          className="sm:w-64"
        />
        <FilterBar
          value={statusFilter}
          onChange={(v) => {
            setStatusFilter(v);
            setPage(1);
          }}
          options={orderStatuses}
          allLabel="All Status"
        />
        <Link href="/admin/dashboard">
          <Button variant="outline">Order Dashboard</Button>
        </Link>
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
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-medium text-gray-900 truncate">
                          Order #{order.id} - {order.name || "N/A"}
                        </h3>
                        <StatusBadge status={order.status} />
                      </div>
                      <p className="text-sm text-gray-500">
                        {order.username || order.email} | Size: {order.size || "N/A"} | Qty: {order.quantity}
                      </p>
                      <p className="text-sm text-gray-500">
                        {order.address}, {order.district} - {order.pincode}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Payment: <StatusBadge status={order.paymentStatus} />
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-pink-500">{formatPrice(Number(order.subtotal) || 0)}</p>
                      <p className="text-xs text-gray-500">
                        {order.orderDate ? new Date(order.orderDate).toLocaleDateString("en-IN") : ""}
                      </p>
                      <select
                        value={order.status}
                        onChange={(e) => handleStatusChange(order, e.target.value)}
                        className="mt-2 h-8 rounded border border-input bg-background px-2 text-xs"
                      >
                        {statusOptions.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          <Pagination pagination={pagination} onPageChange={setPage} />
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
