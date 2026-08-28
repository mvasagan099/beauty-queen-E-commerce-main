"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useAdminOrder, useUpdateAdminOrderStatus } from "@/hooks/use-orders";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { formatPrice, getProductImageUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useState } from "react";

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

const paymentStatusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PAID: "bg-green-100 text-green-700",
  CAPTURED: "bg-green-100 text-green-700",
  COMPLETED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  REFUNDED: "bg-orange-100 text-orange-700",
  COD: "bg-blue-100 text-blue-700",
  PENDING_COD: "bg-blue-100 text-blue-700",
};

const statusOptions = [
  "Pending",
  "Confirmed",
  "Processing",
  "Shipped",
  "Out for Delivery",
  "Delivered",
  "Cancelled",
];

export default function AdminOrderDetailPage() {
  const params = useParams();
  const orderId = Number(params.id);
  const [statusNote, setStatusNote] = useState("");
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [pendingStatus, setPendingStatus] = useState("");

  const { data, isLoading, error } = useAdminOrder(orderId);
  const updateStatus = useUpdateAdminOrderStatus();

  const handleStatusChange = (newStatus: string) => {
    if (newStatus === "Cancelled") {
      setPendingStatus(newStatus);
      setShowCancelConfirm(true);
      return;
    }
    updateStatus.mutate(
      { id: orderId, status: newStatus, note: statusNote || undefined },
      {
        onSuccess: () => {
          setStatusNote("");
        },
      }
    );
  };

  const confirmStatusChange = () => {
    updateStatus.mutate(
      { id: orderId, status: pendingStatus, note: statusNote || undefined },
      {
        onSuccess: () => {
          setStatusNote("");
          setShowCancelConfirm(false);
          setPendingStatus("");
        },
      }
    );
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
      </div>
    );
  }

  if (error || !data?.order) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Order Not Found</h1>
          <Link href="/admin/orders">
            <Button className="bg-pink-500 hover:bg-pink-600 text-white">
              Back to Orders
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const order = data.order;
  const price = Number(order.price) || 0;
  const subtotal = Number(order.subtotal) || price * (order.quantity || 1);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/admin/orders" className="text-pink-500 hover:underline text-sm">
          ← Back to Orders
        </Link>
      </div>

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Order #{order.id}
          </h1>
          <p className="text-gray-500 mt-1">
            Placed on{" "}
            {order.orderDate
              ? new Date(order.orderDate).toLocaleDateString("en-IN", {
                  dateStyle: "long",
                })
              : "N/A"}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
              statusColors[order.status] || "bg-gray-100 text-gray-700"
            }`}
          >
            {order.status}
          </span>
          <span
            className={`inline-block rounded-full px-3 py-1 text-xs font-medium ${
              paymentStatusColors[order.paymentStatus] || "bg-gray-100 text-gray-700"
            }`}
          >
            Payment: {order.paymentStatus}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Product Info */}
          <Card>
            <CardHeader>
              <CardTitle>Product Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="h-24 w-24 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
                  <img
                    src={getProductImageUrl(order.product?.image || order.image)}
                    alt={order.product?.name || order.name || "Product"}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-gray-900">
                    {order.product?.name || order.name || `Order #${order.id}`}
                  </h3>
                  <div className="flex gap-4 mt-2 text-sm text-gray-600">
                    <span>Size: {order.size || "N/A"}</span>
                    <span>Qty: {order.quantity}</span>
                  </div>
                  <p className="text-lg font-bold text-pink-500 mt-2">
                    {formatPrice(price)} × {order.quantity} = {formatPrice(subtotal)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Address */}
          <Card>
            <CardHeader>
              <CardTitle>Shipping Address</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-700 space-y-1">
                <p className="font-medium">{order.username}</p>
                <p>{order.address}</p>
                <p>
                  {order.district} - {order.pincode}
                </p>
                {order.landmark && <p>Landmark: {order.landmark}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Payment */}
          <Card>
            <CardHeader>
              <CardTitle>Payment Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-600">Method</span>
                  <span className="font-medium">{order.paymentMethod || "N/A"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status</span>
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      paymentStatusColors[order.paymentStatus] || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {order.paymentStatus}
                  </span>
                </div>
                {order.paymentId && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">Payment ID</span>
                    <span className="font-mono text-xs">{order.paymentId}</span>
                  </div>
                )}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total</span>
                    <span className="text-pink-500">{formatPrice(subtotal)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Status Update */}
          <Card>
            <CardHeader>
              <CardTitle>Update Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status Note (optional)
                </label>
                <input
                  type="text"
                  value={statusNote}
                  onChange={(e) => setStatusNote(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  placeholder="Add a note..."
                />
              </div>
              <select
                value={order.status}
                onChange={(e) => handleStatusChange(e.target.value)}
                className="w-full h-10 rounded-md border border-input bg-background px-3 text-sm"
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
              {updateStatus.isPending && (
                <p className="text-sm text-gray-500">Updating...</p>
              )}
              {updateStatus.isError && (
                <p className="text-sm text-red-500">Failed to update status.</p>
              )}
            </CardContent>
          </Card>

          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Order Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderTimeline
                currentStatus={order.status}
                statusHistory={order.statusHistory}
                shippedAt={order.shippedAt}
                deliveredAt={order.deliveredAt}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={showCancelConfirm}
        onOpenChange={(open) => {
          if (!open) setShowCancelConfirm(false);
        }}
        title="Cancel this order?"
        description={`Are you sure you want to cancel order #${orderId}? This action cannot be undone.`}
        confirmLabel="Cancel Order"
        destructive
        isLoading={updateStatus.isPending}
        onConfirm={confirmStatusChange}
      />
    </div>
  );
}
