"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supportApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Reply, LifeBuoy, X, Users } from "lucide-react";

interface TicketSummary {
  id: number;
  ticketNumber: string;
  subject: string;
  orderId: number | null;
  customer: { id: number; name: string | null; email: string } | null;
  status: string;
  priority: string;
  lastActivity: string | null;
  createdAt: string;
}

interface AdminMessage {
  id: number;
  authorRole: string;
  body: string;
  isInternal: boolean;
  createdAt: string;
}

interface TicketDetail extends TicketSummary {
  order: { id: number; name: string | null; status: string; totalAmount: string } | null;
  messages: AdminMessage[];
}

const STATUSES = ["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"];

const statusColors: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-100 text-gray-700",
};

const priorityColors: Record<string, string> = {
  LOW: "bg-gray-100 text-gray-600",
  MEDIUM: "bg-yellow-100 text-yellow-700",
  HIGH: "bg-red-100 text-red-700",
};

export default function AdminSupportPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [isInternal, setIsInternal] = useState(false);
  const [newStatus, setNewStatus] = useState("");

  const { data, isLoading } = useQuery<{
    success: boolean;
    tickets: TicketSummary[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>({
    queryKey: ["admin-support-tickets", statusFilter],
    queryFn: () => supportApi.adminList({ status: statusFilter || undefined }),
  });

  const { data: detailData, refetch: refetchDetail } = useQuery<{ success: boolean; ticket: TicketDetail }>({
    queryKey: ["admin-support-ticket", selectedId],
    queryFn: () => supportApi.adminGet(selectedId as number),
    enabled: !!selectedId,
  });

  const selected = detailData?.ticket;

  const replyMutation = useMutation({
    mutationFn: () =>
      supportApi.adminReply(
        selectedId as number,
        replyBody,
        isInternal || undefined,
      ),
    onSuccess: () => {
      setReplyBody("");
      setIsInternal(false);
      refetchDetail();
      queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
      toast.success(isInternal ? "Internal note added" : "Reply posted");
    },
    onError: (err: Error) => toast.error(err.message || "Could not post reply"),
  });

  const statusMutation = useMutation({
    mutationFn: () =>
      supportApi.adminUpdateStatus(selectedId as number, {
        status: newStatus,
      }),
    onSuccess: () => {
      refetchDetail();
      queryClient.invalidateQueries({ queryKey: ["admin-support-tickets"] });
      toast.success("Ticket status updated");
    },
    onError: (err: Error) => toast.error(err.message || "Could not update status"),
  });

  const tickets = data?.tickets || [];

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Support Tickets</h1>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-gray-100 px-3 py-1 text-sm text-gray-600">
          <Users className="h-4 w-4" />
          {data?.pagination?.total ?? 0} total
        </span>
      </div>

      <div className="flex items-center gap-2 mb-6">
        <label htmlFor="status-filter" className="text-sm font-medium text-gray-600">
          Status
        </label>
        <select
          id="status-filter"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500"
        >
          <option value="">All</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {s.replace(/_/g, " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket list */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="flex items-center justify-center min-h-[30vh]">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
            </div>
          ) : tickets.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-16 text-center">
              <LifeBuoy className="h-10 w-10 text-gray-300" />
              <p className="text-gray-500">No tickets found.</p>
            </div>
          ) : (
            tickets.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setSelectedId(t.id);
                  setNewStatus(t.status);
                }}
                className={`w-full rounded-lg border p-4 text-left transition-colors ${
                  selectedId === t.id
                    ? "border-pink-500 bg-pink-50/50"
                    : "border-gray-200 hover:border-pink-300"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium text-gray-900 truncate">{t.subject || t.ticketNumber}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {t.ticketNumber} · {t.customer?.email || "Unknown"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${priorityColors[t.priority] || "bg-gray-100 text-gray-600"}`}>
                      {t.priority}
                    </span>
                    <span className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${statusColors[t.status] || "bg-gray-100 text-gray-700"}`}>
                      {t.status.replace(/_/g, " ")}
                    </span>
                  </div>
                </div>
                {t.lastActivity && (
                  <p className="mt-2 text-xs text-gray-400">
                    Last activity {new Date(t.lastActivity).toLocaleString("en-IN")}
                  </p>
                )}
              </button>
            ))
          )}
        </div>

        {/* Ticket detail */}
        {selected && (
          <div className="rounded-lg border border-gray-200">
            <div className="flex items-start justify-between border-b border-gray-100 p-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-semibold text-gray-900">{selected.subject}</h2>
                  <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[selected.status] || "bg-gray-100 text-gray-700"}`}>
                    {selected.status.replace(/_/g, " ")}
                  </span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {selected.ticketNumber} · {selected.customer?.name || selected.customer?.email || "Unknown"}
                </p>
                {selected.order && (
                  <p className="text-sm text-gray-500 mt-0.5">
                    Order #{selected.order.id} · {selected.order.name || "Product"} ·{" "}
                    {selected.order.status} · ₹{(Number(selected.order.totalAmount) || 0).toLocaleString("en-IN")}
                  </p>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="space-y-3 p-4 max-h-[420px] overflow-y-auto">
              {selected.messages.map((m) => (
                <div
                  key={m.id}
                  className={`rounded-lg p-3 text-sm ${
                    m.isInternal
                      ? "border border-dashed border-amber-300 bg-amber-50 text-amber-900"
                      : m.authorRole === "CUSTOMER"
                      ? "bg-pink-50 text-gray-800"
                      : "bg-gray-100 text-gray-800"
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                      {m.isInternal
                        ? "Internal note"
                        : m.authorRole === "CUSTOMER"
                        ? "Customer"
                        : "Support"}
                    </span>
                    <span className="text-xs text-gray-400">{new Date(m.createdAt).toLocaleString("en-IN")}</span>
                  </div>
                  <p className="whitespace-pre-line">{m.body}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-100 p-4 space-y-3">
              <div className="flex items-center gap-2">
                <label htmlFor="ticket-status" className="text-sm font-medium text-gray-600">
                  Status
                </label>
                <select
                  id="ticket-status"
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="rounded-md border border-gray-300 bg-white px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-pink-500"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!newStatus || newStatus === selected.status || statusMutation.isPending}
                  onClick={() => statusMutation.mutate()}
                >
                  {statusMutation.isPending ? "Saving..." : "Update"}
                </Button>
              </div>

              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="Write a reply... (check 'Internal note' for a customer-invisible note)"
                maxLength={5000}
              />
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 text-sm text-gray-600">
                  <input
                    type="checkbox"
                    checked={isInternal}
                    onChange={(e) => setIsInternal(e.target.checked)}
                    className="h-4 w-4 rounded border-gray-300 text-pink-500 focus:ring-pink-500"
                  />
                  Internal note (hidden from customer)
                </label>
                <Button
                  className="bg-pink-500 hover:bg-pink-600 text-white"
                  disabled={!replyBody.trim() || replyMutation.isPending}
                  onClick={() => replyMutation.mutate()}
                >
                  <Reply className="h-4 w-4 mr-1.5" />
                  {replyMutation.isPending ? "Posting..." : isInternal ? "Add Note" : "Reply"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}