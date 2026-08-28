import { cn } from "@/lib/utils";

const colorMap: Record<string, string> = {
  // Order status
  Pending: "bg-yellow-100 text-yellow-700",
  Confirmed: "bg-blue-100 text-blue-700",
  Processing: "bg-indigo-100 text-indigo-700",
  Shipped: "bg-purple-100 text-purple-700",
  Delivered: "bg-green-100 text-green-700",
  Cancelled: "bg-red-100 text-red-700",
  Refunded: "bg-orange-100 text-orange-700",
  // Payment status
  Completed: "bg-green-100 text-green-700",
  Failed: "bg-red-100 text-red-700",
  // Razorpay status
  PENDING: "bg-yellow-100 text-yellow-700",
  AUTHORIZED: "bg-blue-100 text-blue-700",
  CAPTURED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
  REFUNDED: "bg-orange-100 text-orange-700",
  PARTIALLY_REFUNDED: "bg-orange-100 text-orange-700",
  // Product / generic
  Active: "bg-green-100 text-green-700",
  Inactive: "bg-gray-100 text-gray-700",
  Deleted: "bg-red-100 text-red-700",
  Low: "bg-orange-100 text-orange-700",
  "Out of Stock": "bg-red-100 text-red-700",
  "In Stock": "bg-green-100 text-green-700",
};

const DEFAULT_CLASSES = "bg-gray-100 text-gray-700";

export function StatusBadge({
  status,
  className,
}: {
  status: string | boolean | null | undefined;
  className?: string;
}) {
  const key = String(status ?? "");
  const color = colorMap[key] || DEFAULT_CLASSES;
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
        color,
        className
      )}
    >
      {String(status ?? "N/A")}
    </span>
  );
}
