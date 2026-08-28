export const config = {
  apiUrl: process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api",
  appName: "Beauty Queen",
  categories: ["saree", "kurthi", "top", "leggin", "cosmetics"] as const,
  orderStatuses: [
    "Pending",
    "Processing",
    "Shipped",
    "Delivered",
    "Cancelled",
  ] as const,
  sizes: ["Small", "Medium", "Large", "XL", "XXL"] as const,
} as const;

export type Category = (typeof config.categories)[number];
export type Size = (typeof config.sizes)[number];
export type OrderStatusType = (typeof config.orderStatuses)[number];
