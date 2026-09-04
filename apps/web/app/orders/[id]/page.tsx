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
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { LoadingPage } from "@/components/ui/spinner";
import { useState } from "react";
import { ArrowLeft, Package, Truck, CreditCard, FileText, X } from "lucide-react";

const statusVariant: Record<string, "default" | "success" | "warning" | "destructive" | "info" | "secondary"> = {
  Pending: "warning",
  Confirmed: "info",
  Processing: "info",
  Shipped: "default",
  "Out for Delivery": "default",
  Delivered: "success",
  Cancelled: "destructive",
  Refunded: "info",
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
    return <LoadingPage text="Loading order details..." />;
  }

  if (error || !data?.order) {
    return (
      <div className="page-container">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-foreground mb-2">Order Not Found</h1>
          <p className="text-muted-foreground mb-6">The order you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.</p>
          <Link href="/orders">
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">Back to Orders</Button>
          </Link>
        </div>
      </div>
    );
  }

  const order = data.order;
  const canCancel = ["Pending", "Confirmed"].includes(order.status);
  const price = Number(order.price) || 0;
  const subtotal = Number(order.subtotal) || price * (order.quantity || 1);
  const discount = Number(order.discountAmount) || Number(order.couponDiscount) || 0;
  const shipping = Number(order.shippingAmount) || 0;
  const tax = Number(order.taxAmount) || 0;
  const total = Number(order.totalAmount) || Math.max(0, subtotal - discount + shipping + tax) || subtotal;

  const statusHistory = historyData?.history?.length ? historyData.history : order.statusHistory;

  return (
    <div className="page-container max-w-5xl">
      <div className="mb-6">
        <Link href="/orders" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-primary transition-colors">
          <ArrowLeft className="h-4 w-4" />
          Back to Orders
        </Link>
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-8">
        <div>
          <h1 className="page-title mb-1">Order #{order.id}</h1>
          <p className="text-muted-foreground text-sm">
            Placed on{" "}
            {order.orderDate
              ? new Date(order.orderDate).toLocaleDateString("en-IN", { dateStyle: "long" })
              : "N/A"}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant={statusVariant[order.status] || "secondary"}>
            {order.status}
          </Badge>
          <Badge variant={order.paymentStatus === "PAID" || order.paymentStatus === "CAPTURED" ? "success" : order.paymentStatus === "FAILED" ? "destructive" : "warning"}>
            {order.paymentStatus}
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Package className="h-4 w-4" />
                Product Details
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
                  <img
                    src={getProductImageUrl(order.product?.image || order.image)}
                    alt={order.product?.name || order.name || "Product"}
                    className="h-full w-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-foreground">
                    {order.product?.name || order.name || `Order #${order.id}`}
                  </h3>
                  {order.product?.description && (
                    <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                      {order.product.description}
                    </p>
                  )}
                  <div className="flex gap-3 mt-1.5 text-sm text-muted-foreground">
                    {order.size && <span>Size: {order.size}</span>}
                    <span>Qty: {order.quantity}</span>
                  </div>
                  <p className="text-base font-bold text-primary mt-2">
                    {formatPrice(price)} × {order.quantity} = {formatPrice(subtotal)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <Truck className="h-4 w-4" />
                Shipping Address
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground space-y-0.5">
                <p className="font-medium text-foreground">{order.username}</p>
                <p>{order.address}</p>
                <p>{order.district} - {order.pincode}</p>
                {order.landmark && <p>Landmark: {order.landmark}</p>}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <CreditCard className="h-4 w-4" />
                Payment Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Method</span>
                  <span className="font-medium">
                    {order.paymentMethod === "cod" || order.paymentMethod === "COD"
                      ? "Cash on Delivery"
                      : order.paymentMethod === "upi" || order.paymentMethod === "UPI"
                      ? "UPI"
                      : order.paymentMethod || "N/A"}
                  </span>
                </div>
                {order.paymentId && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Payment ID</span>
                    <span className="font-mono text-xs">{order.paymentId}</span>
                  </div>
                )}
                <Separator />
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Discount {order.couponCode ? `(${order.couponCode})` : ""}</span>
                    <span>-{formatPrice(discount)}</span>
                  </div>
                )}
                {tax > 0 && (
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tax</span>
                    <span>{formatPrice(tax)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Shipping</span>
                  <span>{shipping > 0 ? formatPrice(shipping) : "Free"}</span>
                </div>
                <Separator />
                <div className="flex justify-between font-bold text-lg">
                  <span>Total</span>
                  <span className="text-primary">{formatPrice(total)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {(order.trackingNumber || order.carrier) && (
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="flex items-center gap-2 text-base">
                  <Truck className="h-4 w-4" />
                  Shipping Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  {order.carrier && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Carrier</span>
                      <span className="font-medium">{order.carrier}</span>
                    </div>
                  )}
                  {order.trackingNumber && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tracking Number</span>
                      <span className="font-mono text-xs">{order.trackingNumber}</span>
                    </div>
                  )}
                  {order.trackingUrl && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Tracking URL</span>
                      <a
                        href={order.trackingUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        Track Order
                      </a>
                    </div>
                  )}
                  {order.shippedAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Shipped On</span>
                      <span>{new Date(order.shippedAt).toLocaleDateString("en-IN")}</span>
                    </div>
                  )}
                  {order.deliveredAt && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Delivered On</span>
                      <span>{new Date(order.deliveredAt).toLocaleDateString("en-IN")}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="text-base">Order Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {historyLoading ? (
                <p className="text-sm text-muted-foreground">Loading timeline...</p>
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

          <Card>
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4" />
                Invoice
              </CardTitle>
            </CardHeader>
            <CardContent>
              {invoiceLoading ? (
                <p className="text-sm text-muted-foreground">Loading invoice...</p>
              ) : invoiceData?.invoiceNumber ? (
                <div className="text-sm">
                  <p className="font-medium text-foreground">{invoiceData.invoiceNumber}</p>
                  <p className="text-muted-foreground text-xs mt-0.5">
                    Generated for order #{order.id}
                  </p>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Invoice becomes available once the order is confirmed.
                </p>
              )}
            </CardContent>
          </Card>

          {canCancel && (
            <Button
              variant="outline"
              className="w-full text-destructive border-destructive/30 hover:bg-destructive hover:text-destructive-foreground"
              onClick={() => setShowCancelModal(true)}
            >
              Cancel Order
            </Button>
          )}

          {order.status === "Delivered" && (
            <Link href={`/account/returns/request?orderId=${order.id}`} className="block">
              <Button
                variant="outline"
                className="w-full"
              >
                Request a Return
              </Button>
            </Link>
          )}
        </div>
      </div>

      {showCancelModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-xl p-6 max-w-md w-full shadow-xl animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-foreground">Cancel Order</h3>
              <button
                onClick={() => { setShowCancelModal(false); setCancelReason(""); }}
                className="p-1 rounded-md hover:bg-muted transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <p className="text-muted-foreground mb-4 text-sm">
              Are you sure you want to cancel order #{order.id}? This action cannot be undone.
            </p>
            <div className="mb-4">
              <label htmlFor="cancel-reason" className="block text-sm font-medium text-foreground mb-1.5">
                Reason (optional)
              </label>
              <Textarea
                id="cancel-reason"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={3}
                placeholder="Why are you cancelling?"
              />
            </div>
            <div className="flex gap-3 justify-end">
              <Button
                variant="outline"
                onClick={() => { setShowCancelModal(false); setCancelReason(""); }}
              >
                Keep Order
              </Button>
              <Button
                className="bg-destructive hover:bg-destructive/90 text-destructive-foreground"
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
