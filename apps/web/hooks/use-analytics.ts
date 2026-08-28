"use client";

import { useQuery } from "@tanstack/react-query";
import { analyticsApi } from "@/lib/api";

export type AnalyticsRange =
  | "today"
  | "7d"
  | "30d"
  | "month"
  | "custom";

export const ANALYTICS_RANGE_OPTIONS: { value: AnalyticsRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "month", label: "This month" },
  { value: "custom", label: "Custom range" },
];

export function useAdminOverview(range?: AnalyticsRange, from?: string, to?: string) {
  return useQuery({
    queryKey: ["admin-analytics-overview", range, from, to],
    queryFn: () => analyticsApi.adminOverview(range, from, to),
  });
}

export function useAdminSales(range?: AnalyticsRange, from?: string, to?: string) {
  return useQuery({
    queryKey: ["admin-analytics-sales", range, from, to],
    queryFn: () => analyticsApi.adminSales(range, from, to),
  });
}

export function useAdminOrders(range?: AnalyticsRange, from?: string, to?: string) {
  return useQuery({
    queryKey: ["admin-analytics-orders", range, from, to],
    queryFn: () => analyticsApi.adminOrders(range, from, to),
  });
}

export function useAdminProducts(range?: AnalyticsRange, from?: string, to?: string) {
  return useQuery({
    queryKey: ["admin-analytics-products", range, from, to],
    queryFn: () => analyticsApi.adminProducts(range, from, to),
  });
}

export function useSellerOverview(range?: AnalyticsRange, from?: string, to?: string) {
  return useQuery({
    queryKey: ["seller-analytics-overview", range, from, to],
    queryFn: () => analyticsApi.sellerOverview(range, from, to),
  });
}

export function useLowStockThreshold() {
  return useQuery({
    queryKey: ["low-stock-threshold"],
    queryFn: () => analyticsApi.lowStockThreshold(),
  });
}
