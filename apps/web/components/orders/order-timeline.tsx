"use client";

import type { OrderStatusHistory } from "@/types";
import { cn } from "@/lib/utils";
import { Check, X, Clock } from "lucide-react";

const STATUS_ORDER = [
  "Pending",
  "Confirmed",
  "Processing",
  "Shipped",
  "Out for Delivery",
  "Delivered",
];

const STATUS_CONFIG: Record<string, { label: string }> = {
  Pending: { label: "Order Placed" },
  Confirmed: { label: "Order Confirmed" },
  Processing: { label: "Processing" },
  Shipped: { label: "Shipped" },
  "Out for Delivery": { label: "Out for Delivery" },
  Delivered: { label: "Delivered" },
};

interface OrderTimelineProps {
  currentStatus: string;
  statusHistory?: OrderStatusHistory[];
  shippedAt?: string | null;
  deliveredAt?: string | null;
}

export function OrderTimeline({
  currentStatus,
  statusHistory,
}: OrderTimelineProps) {
  if (currentStatus === "Cancelled") {
    return (
      <div className="flex items-center gap-4 p-5 bg-destructive/5 rounded-xl border border-destructive/20">
        <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center flex-shrink-0">
          <X className="h-5 w-5 text-destructive" />
        </div>
        <div>
          <p className="font-semibold text-foreground">Order Cancelled</p>
          {statusHistory && statusHistory.length > 0 && (
            <p className="text-sm text-muted-foreground mt-0.5">
              {statusHistory.find((h) => h.newStatus === "Cancelled")?.note ||
                "This order has been cancelled."}
            </p>
          )}
        </div>
      </div>
    );
  }

  if (currentStatus === "Refunded") {
    return (
      <div className="flex items-center gap-4 p-5 bg-orange-50 rounded-xl border border-orange-200">
        <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center flex-shrink-0">
          <span className="text-orange-600 font-bold text-sm">₹</span>
        </div>
        <div>
          <p className="font-semibold text-foreground">Order Refunded</p>
          <p className="text-sm text-muted-foreground mt-0.5">This order has been refunded.</p>
        </div>
      </div>
    );
  }

  const currentIdx = STATUS_ORDER.indexOf(currentStatus);

  const completedStatuses = statusHistory
    ? statusHistory
        .filter((h) => h.newStatus !== "Cancelled")
        .map((h) => h.newStatus)
    : [];

  return (
    <div className="space-y-0" role="list" aria-label="Order progress">
      {STATUS_ORDER.map((status, idx) => {
        const isCompleted = completedStatuses.includes(status) || idx < currentIdx;
        const isCurrent = status === currentStatus;
        const isPending = idx > currentIdx;
        const historyEntry = statusHistory?.find((h) => h.newStatus === status);

        return (
          <div key={status} className="flex gap-3" role="listitem">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors",
                  isCompleted || isCurrent
                    ? "bg-primary border-primary text-primary-foreground"
                    : "bg-background border-border text-muted-foreground"
                )}
              >
                {isCompleted || isCurrent ? (
                  <Check className="h-4 w-4" />
                ) : (
                  idx + 1
                )}
              </div>
              {idx < STATUS_ORDER.length - 1 && (
                <div
                  className={cn(
                    "w-0.5 h-8 transition-colors",
                    isCompleted && !isPending ? "bg-primary" : "bg-border"
                  )}
                />
              )}
            </div>
            <div className="pb-4 pt-1">
              <p
                className={cn(
                  "font-medium text-sm",
                  isCurrent ? "text-primary" : isCompleted ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {STATUS_CONFIG[status]?.label}
              </p>
              {isCurrent && (
                <div className="flex items-center gap-1 mt-0.5">
                  <Clock className="h-3 w-3 text-primary" />
                  <p className="text-xs text-primary font-medium">Current status</p>
                </div>
              )}
              {historyEntry && (
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(historyEntry.changedAt).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              )}
              {historyEntry?.note && (
                <p className="text-xs text-muted-foreground mt-0.5 italic">
                  {historyEntry.note}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
