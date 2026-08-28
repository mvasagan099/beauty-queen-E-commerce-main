"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import {
  useOrder,
  useCancelOrder,
  useOrderInvoice,
  useOrderHistory,
} from "@/hooks/use-orders";
import { OrderTimeline } from "@/components/orders/order-timeline";
import { formatPrice, getProductImageUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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

export default function OrderDetailPage() {
  const params = useParams();
  const orderId = Number(params.id);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");

  const { data, isLoading, error } = useOrder(orderId);
  const cancelOrder = useCancelOrder();
  const { data: invoiceData, isFetching: invoiceLoading } = useOrderInvoice(orderId);
  const { data: historyData, isLoading: historyLoading } = useOrderHistory(orderId);

  const handleCancel = () => {
    cancelOrder.mutate(
      { id: orderId, reason: cancelReason },
      {
        onSuccess: () => {
          setShowCancelModal(false);
          setCancelReason("");
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
          <p className="text-gray-500 mb-4">The order you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.</p>
          <Link href="/orders">
            <Button className="bg-pink-500 hover:bg-pink-600 text-white">
              Back to Orders
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const order = data.order;
  const canCancel = ["Pending", "Confirmed"].includes(order.status);
  const price = Number(order.price) || 0;
  const subtotal =
    Number(order.subtotal) || price * (order.quantity || 1);
  const discount =
    Number(order.discountAmount) || Number(order.couponDiscount) || 0;
  const shipping = Number(order.shippingAmount) || 0;
  const tax = Number(order.taxAmount) || 0;
  const total =
    Number(order.totalAmount) ||
    Math.max(0, subtotal - discount + shipping + tax) ||
    subtotal;

  const statusHistory = historyData?.history?.length
    ? historyData.history
    : order.statusHistory;

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <Link href="/orders" className="text-pink-500 hover:underline text-sm">
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
                  {order.product?.description && (
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {order.product.description}
                    </p>
                  )}
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
                  <span className="font-medium">
                    {order.paymentMethod === "cod" || order.paymentMethod === "COD"
                      ? "Cash on Delivery"
                      : order.paymentMethod === "upi" || order.paymentMethod === "UPI"
                      ? "UPI"
                      : order.paymentMethod || "N/A"}
                  </span>
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
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>{formatPrice(subtotal)}</span>
                  </div>
                  {discount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">
                        Discount
                        {order.couponCode ? ` (${order.couponCode})` : ""}
                      </span>
                      <span className="text-green-600">
                        -{formatPrice(discount)}
                      </span>
                    </div>
                  )}
                  {tax > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax</span>
                      <span>{formatPrice(tax)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span>{shipping > 0 ? formatPrice(shipping) : "Free"}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg mt-2">
                    <span>Total</span>
                    <span className="text-pink-500">{formatPrice(total)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Info */}
          {(order.trackingNumber || order.carrier) && (
            <Card>
              <CardHeader>
                <CardTitle>Shipping Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {order.carrier && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Carrier</span>
                      <span className="font-medium">{order.carrier}</span>
                    </div>
                  )}
                  {order.trackingNumber && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tracking Number</span>
                      <span className="font-mono text-xs">{order.trackingNumber}</span>
                    </div>
                  )}
                  {order.trackingUrl && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tracking URL</span>
                      <a
                        href={order.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-pink-500 hover:underline"
                      >
                        Track Order
                      </a>
                    </div>
                  )}
                  {order.shippedAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Shipped On</span>
                      <span>{new Date(order.shippedAt).toLocaleDateString("en-IN")}</span>
                    </div>
                  )}
                  {order.deliveredAt && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Delivered On</span>
                      <span>{new Date(order.deliveredAt).toLocaleDateString("en-IN")}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Right sidebar */}
        <div className="space-y-6">
          {/* Timeline */}
          <Card>
            <CardHeader>
              <CardTitle>Order Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <p className="text-sm text-gray-500">Loading timeline...</p>
              ) : (
                <OrderTimeline
                  currentStatus={order.status}
                  statusHistory={statusHistory}
                  shippedAt={order.shippedAt}
                  deliveredAt={order.deliveredAt}
                />
              )}
            </CardContent>
          </Card>

          {/* Invoice */}
          <Card>
            <CardHeader>
              <CardTitle>Invoice</CardTitle>
            </CardHeader>
            <CardContent>
              {invoiceLoading ? (
                <p className="text-sm text-gray-500">Loading invoice...</p>
              ) : invoiceData?.invoiceNumber ? (
                <div className="text-sm space-y-1">
                  <p className="font-medium text-gray-900">{invoiceData.invoiceNumber}</p>
                  <p className="text-gray-500">
                    Generated for order #{order.id}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">
                  Invoice becomes available once the order is confirmed.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Actions */}
          {canCancel && (
            <Card>
              <CardContent className="pt-6">
                <Button
                  variant="outline"
                  className="w-full border-red-500 text-red-500 hover:bg-red-500 hover:text-white"
                  onClick={() => setShowCancelModal(true)}
                >
                  Cancel Order
                </Button>
              </CardContent>
            </Card>
          )}

          {order.status === "Delivered" && (
            <Card>
              <CardContent className="pt-6">
                <Link href={`/account/returns/request?orderId=${order.id}`}>
                  <Button
                    variant="outline"
                    className="w-full border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white"
                  >
                    Request a Return
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Cancel Modal */}
      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-bold text-gray-900 mb-4">Cancel Order</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to cancel order #{order.id}? This action cannot be undone.
            </p>
            <div className="mb-4">
              <label
                htmlFor="cancel-reason"
                className="block text-sm font-medium text-gray-700 mb-1"
              >
                Reason (optional)
              </label>
              <textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                rows={3}
                placeholder="Why are you cancelling?"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason("");
                }}
              >
                Keep Order
              </Button>
              <Button
                className="bg-red-500 hover:bg-red-600 text-white"
                onClick={handleCancel}
                disabled={cancelOrder.isPending}
              >
                {cancelOrder.isPending ? "Cancelling..." : "Cancel Order"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
