"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

const refundStatusColors: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700",
  PROCESSING: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-green-100 text-green-700",
  FAILED: "bg-red-100 text-red-700",
};

export default function AdminRefundsPage() {
  const [statusFilter, setStatusFilter] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin-refunds", statusFilter],
    queryFn: () => api.get(`/refunds/admin?status=${statusFilter || ""}`),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
      </div>
    );
  }

  const refunds: any[] = data?.refunds || [];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Refund Management</h1>

      <div className="mb-6">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">All Status</option>
          {Object.keys(refundStatusColors).map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium">ID</th>
                  <th className="px-4 py-3 text-left font-medium">Customer</th>
                  <th className="px-4 py-3 text-left font-medium">Checkout</th>
                  <th className="px-4 py-3 text-left font-medium">Amount</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Provider ID</th>
                  <th className="px-4 py-3 text-left font-medium">Created</th>
                </tr>
              </thead>
              <tbody>
                {refunds.map((refund: any) => (
                  <tr key={refund.id} className="border-b">
                    <td className="px-4 py-3">#{refund.id}</td>
                    <td className="px-4 py-3">{refund.user?.name || refund.user?.email || "N/A"}</td>
                    <td className="px-4 py-3 font-mono text-xs">{refund.checkoutId?.substring(0, 8)}...</td>
                    <td className="px-4 py-3 font-medium">{formatPrice(Number(refund.amount))}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${refundStatusColors[refund.status] || "bg-gray-100 text-gray-700"}`}>
                        {refund.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">{refund.providerRefundId || "N/A"}</td>
                    <td className="px-4 py-3">{new Date(refund.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
                {refunds.length === 0 && (
                  <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-500">No refunds found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
