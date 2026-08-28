"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ordersApi, sellerOrdersApi, adminOrdersApi } from "@/lib/api";

export function useOrders(page?: number, limit?: number) {
  return useQuery({
    queryKey: ["orders", page, limit],
    queryFn: () => ordersApi.list({ page, limit }),
  });
}

export function useOrder(id: number) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: () => ordersApi.get(id),
    enabled: !!id,
  });
}

export function useOrderHistory(id: number) {
  return useQuery({
    queryKey: ["order-history", id],
    queryFn: () => ordersApi.history(id),
    enabled: !!id,
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, reason }: { id: number; reason?: string }) =>
      ordersApi.cancel(id, reason),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      queryClient.invalidateQueries({ queryKey: ["order", variables.id] });
    },
  });
}

export function useSellerOrders(params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  paymentStatus?: string;
}) {
  return useQuery({
    queryKey: ["seller-orders", params],
    queryFn: () => sellerOrdersApi.list(params),
  });
}

export function useSellerOrder(id: number) {
  return useQuery({
    queryKey: ["seller-order", id],
    queryFn: () => sellerOrdersApi.get(id),
    enabled: !!id,
  });
}

export function useUpdateSellerOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, note }: { id: number; status: string; note?: string }) =>
      sellerOrdersApi.updateStatus(id, status, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-orders"] });
    },
  });
}

export function useAdminOrders(params?: {
  page?: number;
  limit?: number;
  status?: string;
  search?: string;
  paymentStatus?: string;
  dateFrom?: string;
  dateTo?: string;
}) {
  return useQuery({
    queryKey: ["admin-orders", params],
    queryFn: () => adminOrdersApi.list(params),
  });
}

export function useAdminOrder(id: number) {
  return useQuery({
    queryKey: ["admin-order", id],
    queryFn: () => adminOrdersApi.get(id),
    enabled: !!id,
  });
}

export function useUpdateAdminOrderStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status, note }: { id: number; status: string; note?: string }) =>
      adminOrdersApi.updateStatus(id, status, note),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
  });
}

export function useOrderTracking(id: number) {
  return useQuery({
    queryKey: ["order-tracking", id],
    queryFn: () => ordersApi.tracking(id),
    enabled: !!id,
  });
}

export function useOrderInvoice(id: number) {
  return useQuery({
    queryKey: ["order-invoice", id],
    queryFn: () => ordersApi.invoice(id),
    enabled: !!id,
  });
}

export function useAdminOrderDashboard() {
  return useQuery({
    queryKey: ["admin-order-dashboard"],
    queryFn: () => adminOrdersApi.dashboard(),
  });
}
