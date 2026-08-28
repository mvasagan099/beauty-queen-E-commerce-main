"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ReturnRequest } from "@/types";

const returnStatusColors: Record<string, string> = {
  REQUESTED: "bg-yellow-100 text-yellow-700",
  APPROVED: "bg-blue-100 text-blue-700",
  REJECTED: "bg-red-100 text-red-700",
  PICKUP_PENDING: "bg-purple-100 text-purple-700",
  RECEIVED: "bg-indigo-100 text-indigo-700",
  COMPLETED: "bg-green-100 text-green-700",
  CANCELLED: "bg-gray-100 text-gray-700",
};

export default function AdminReturnsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [pendingReject, setPendingReject] = useState<ReturnRequest | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-returns", statusFilter, searchQuery],
    queryFn: () =>
      api.get(`/returns/admin?status=${statusFilter || ""}&search=${searchQuery || ""}`),
  });

  const updateMutation = useMutation({
    mutationFn: (args: { id: number; status: string; note?: string }) =>
      api.patch(`/returns/admin/${args.id}`, { status: args.status, note: args.note }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-returns"] }),
  });

  const confirmReject = () => {
    if (pendingReject) {
      updateMutation.mutate({ id: pendingReject.id, status: "REJECTED" });
      setPendingReject(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
      </div>
    );
  }

  const returns = data?.returns || [];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Return Requests</h1>

      {isError && (
        <p className="text-red-500 text-center py-4">Unable to load return requests.</p>
      )}

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <Input placeholder="Search..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="sm:w-64" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-md border border-input bg-background px-3 text-sm">
          <option value="">All Status</option>
          {Object.keys(returnStatusColors).map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
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
                  <th className="px-4 py-3 text-left font-medium">Order</th>
                  <th className="px-4 py-3 text-left font-medium">Customer</th>
                  <th className="px-4 py-3 text-left font-medium">Product</th>
                  <th className="px-4 py-3 text-left font-medium">Reason</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Requested</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {returns.map((ret: ReturnRequest) => (
                  <tr key={ret.id} className="border-b">
                    <td className="px-4 py-3">#{ret.id}</td>
                    <td className="px-4 py-3">#{ret.orderId}</td>
                    <td className="px-4 py-3">{ret.user?.name || ret.user?.email || "N/A"}</td>
                    <td className="px-4 py-3">{ret.order?.name || "N/A"}</td>
                    <td className="px-4 py-3 max-w-[200px] truncate">{ret.reason}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${returnStatusColors[ret.status] || "bg-gray-100 text-gray-700"}`}>
                        {ret.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3">{new Date(ret.requestedAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      {ret.status === "REQUESTED" && (
                        <div className="flex gap-2">
                          <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white" onClick={() => updateMutation.mutate({ id: ret.id, status: "APPROVED" })}>
                            Approve
                          </Button>
                          <Button size="sm" variant="destructive" onClick={() => setPendingReject(ret)}>
                            Reject
                          </Button>
                        </div>
                      )}
                      {ret.status === "APPROVED" && (
                        <Button size="sm" variant="outline" onClick={() => updateMutation.mutate({ id: ret.id, status: "PICKUP_PENDING" })}>
                          Mark Pickup
                        </Button>
                      )}
                      {ret.status === "RECEIVED" && (
                        <Button size="sm" className="bg-green-500 hover:bg-green-600 text-white" onClick={() => updateMutation.mutate({ id: ret.id, status: "COMPLETED" })}>
                          Complete
                        </Button>
                      )}
                    </td>
                  </tr>
                ))}
                {returns.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No return requests found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!pendingReject}
        onOpenChange={(open) => {
          if (!open) setPendingReject(null);
        }}
        title="Reject this return request?"
        description={
          pendingReject
            ? `Are you sure you want to reject return request #${pendingReject.id} for order #${pendingReject.orderId}?`
            : undefined
        }
        confirmLabel="Reject Return"
        destructive
        isLoading={updateMutation.isPending}
        onConfirm={confirmReject}
      />
    </div>
  );
}
