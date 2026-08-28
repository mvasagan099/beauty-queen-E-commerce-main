"use client";

import type { OrderStatusHistory } from "@/types";

const STATUS_ORDER = [
  "Pending",
  "Confirmed",
  "Processing",
  "Shipped",
  "Out for Delivery",
  "Delivered",
];

const STATUS_CONFIG: Record<string, { label: string; icon: string }> = {
  Pending: { label: "Order Placed", icon: "📋" },
  Confirmed: { label: "Order Confirmed", icon: "✓" },
  Processing: { label: "Processing", icon: "⚙" },
  Shipped: { label: "Shipped", icon: "🚚" },
  "Out for Delivery": { label: "Out for Delivery", icon: "🚚" },
  Delivered: { label: "Delivered", icon: "📦" },
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
      <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg border border-red-200">
        <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-600 text-sm font-bold">
          ✕
        </div>
        <div>
          <p className="font-medium text-red-800">Order Cancelled</p>
          {statusHistory && statusHistory.length > 0 && (
            <p className="text-sm text-red-600">
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
      <div className="flex items-center gap-3 p-4 bg-orange-50 rounded-lg border border-orange-200">
        <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 text-sm font-bold">
          ₹
        </div>
        <div>
          <p className="font-medium text-orange-800">Order Refunded</p>
          <p className="text-sm text-orange-600">This order has been refunded.</p>
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
    <div className="space-y-0">
      {STATUS_ORDER.map((status, idx) => {
        const isCompleted = completedStatuses.includes(status) || idx < currentIdx;
        const isCurrent = status === currentStatus;
        const isPending = idx > currentIdx;

        const historyEntry = statusHistory?.find((h) => h.newStatus === status);

        return (
          <div key={status} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold border-2 ${
                  isCompleted || isCurrent
                    ? "bg-pink-500 border-pink-500 text-white"
                    : "bg-white border-gray-300 text-gray-400"
                }`}
              >
                {isCompleted || isCurrent ? "✓" : idx + 1}
              </div>
              {idx < STATUS_ORDER.length - 1 && (
                <div
                  className={`w-0.5 h-8 ${
                    isCompleted && !isPending ? "bg-pink-500" : "bg-gray-200"
                  }`}
                />
              )}
            </div>
            <div className="pb-4 pt-1">
              <p
                className={`font-medium ${
                  isCurrent
                    ? "text-pink-600"
                    : isCompleted
                    ? "text-gray-900"
                    : "text-gray-400"
                }`}
              >
                {STATUS_CONFIG[status]?.icon} {STATUS_CONFIG[status]?.label}
              </p>
              {isCurrent && (
                <p className="text-sm text-pink-500">Current status</p>
              )}
              {historyEntry && (
                <p className="text-xs text-gray-500 mt-0.5">
                  {new Date(historyEntry.changedAt).toLocaleString("en-IN", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              )}
              {historyEntry?.note && (
                <p className="text-xs text-gray-500 mt-0.5 italic">
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
