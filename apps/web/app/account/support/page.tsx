"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supportApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Plus, MessageSquare, Send, X } from "lucide-react";

interface TicketSummary {
  id: number;
  ticketNumber: string;
  subject: string;
  orderId: number | null;
  status: string;
  priority: string;
  lastActivity: string | null;
  createdAt: string;
}

interface SupportMessage {
  id: number;
  authorRole: string;
  body: string;
  createdAt: string;
}

interface TicketDetail extends TicketSummary {
  messages: SupportMessage[];
  closedAt: string | null;
  resolvedAt: string | null;
}

const statusColors: Record<string, string> = {
  OPEN: "bg-blue-100 text-blue-700",
  IN_PROGRESS: "bg-amber-100 text-amber-700",
  RESOLVED: "bg-green-100 text-green-700",
  CLOSED: "bg-gray-100 text-gray-700",
};

export default function AccountSupportPage() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [orderId, setOrderId] = useState("");
  const [replyBody, setReplyBody] = useState("");

  const { data, isLoading } = useQuery<{ success: boolean; tickets: TicketSummary[] }>({
    queryKey: ["my-support-tickets"],
    queryFn: () => supportApi.list(),
  });

  const { data: detailData, refetch: refetchDetail } = useQuery<{ success: boolean; ticket: TicketDetail }>({
    queryKey: ["my-support-ticket", selectedId],
    queryFn: () => supportApi.get(selectedId as number),
    enabled: !!selectedId,
  });

  const createMutation = useMutation({
    mutationFn: () =>
      supportApi.createTicket({
        subject,
        body,
        ...(orderId ? { orderId: Number(orderId) } : {}),
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["my-support-tickets"] });
      setShowForm(false);
      setSubject("");
      setBody("");
      setOrderId("");
      setSelectedId(res?.ticket?.id ?? null);
      toast.success("Support ticket created");
    },
    onError: (err: Error) => toast.error(err.message || "Could not create ticket"),
  });

  const replyMutation = useMutation({
    mutationFn: () => supportApi.reply(selectedId as number, replyBody),
    onSuccess: () => {
      setReplyBody("");
      refetchDetail();
      queryClient.invalidateQueries({ queryKey: ["my-support-tickets"] });
      toast.success("Reply posted");
    },
    onError: (err: Error) => toast.error(err.message || "Could not post reply"),
  });

  const closeMutation = useMutation({
    mutationFn: () => supportApi.close(selectedId as number),
    onSuccess: () => {
      refetchDetail();
      queryClient.invalidateQueries({ queryKey: ["my-support-tickets"] });
      toast.success("Ticket closed");
    },
    onError: (err: Error) => toast.error(err.message || "Could not close ticket"),
  });

  const tickets = data?.tickets || [];
  const selected = detailData?.ticket;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Support Tickets</h1>
        <Button
          className="bg-pink-500 hover:bg-pink-600 text-white"
          onClick={() => setShowForm((s) => !s)}
        >
          {showForm ? <X className="h-4 w-4 mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
          {showForm ? "Cancel" : "New Ticket"}
        </Button>
      </div>

      {showForm && (
        <div className="mb-8 rounded-lg border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Open a New Ticket</h2>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="ticket-subject">Subject</Label>
              <Input
                id="ticket-subject"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Briefly describe your issue"
                maxLength={200}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticket-order">Order ID (optional)</Label>
              <Input
                id="ticket-order"
                type="number"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="e.g. 42"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="ticket-body">Message</Label>
              <textarea
                id="ticket-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={4}
                className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                placeholder="Tell us what happened so we can help"
                maxLength={5000}
              />
            </div>
            <Button
              className="bg-pink-500 hover:bg-pink-600 text-white"
              disabled={!subject.trim() || !body.trim() || createMutation.isPending}
              onClick={() => createMutation.mutate()}
            >
              {createMutation.isPending ? "Submitting..." : "Submit Ticket"}
            </Button>
          </div>
        </div>
      )}

      {selected && (
        <div className="mb-8 rounded-lg border border-gray-200">
          <div className="flex items-start justify-between border-b border-gray-100 p-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="font-semibold text-gray-900">{selected.subject}</h2>
                <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[selected.status] || "bg-gray-100 text-gray-700"}`}>
                  {selected.status.replace(/_/g, " ")}
                </span>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                {selected.ticketNumber}
                {selected.orderId ? ` · Order #${selected.orderId}` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {selected.status !== "CLOSED" && (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={closeMutation.isPending}
                  onClick={() => closeMutation.mutate()}
                >
                  {closeMutation.isPending ? "Closing..." : "Close Ticket"}
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => setSelectedId(null)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          <div className="space-y-3 p-4">
            {selected.messages.length === 0 && (
              <p className="text-sm text-gray-500">No messages yet.</p>
            )}
            {selected.messages.map((m) => (
              <div
                key={m.id}
                className={`rounded-lg p-3 text-sm ${
                  m.authorRole === "CUSTOMER"
                    ? "bg-pink-50 text-gray-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                    {m.authorRole === "CUSTOMER" ? "You" : "Beauty Queen Support"}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(m.createdAt).toLocaleString("en-IN")}
                  </span>
                </div>
                <p className="whitespace-pre-line">{m.body}</p>
              </div>
            ))}
          </div>

          {selected.status !== "CLOSED" && (
            <div className="border-t border-gray-100 p-4">
              <div className="flex gap-2">
                <textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  rows={2}
                  className="flex-1 rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
                  placeholder="Write a reply..."
                  maxLength={5000}
                />
                <Button
                  className="bg-pink-500 hover:bg-pink-600 text-white"
                  disabled={!replyBody.trim() || replyMutation.isPending}
                  onClick={() => replyMutation.mutate()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center min-h-[30vh]">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center gap-4 min-h-[30vh] justify-center text-center">
          <MessageSquare className="h-10 w-10 text-gray-300" />
          <p className="text-gray-500">No support tickets yet.</p>
          <p className="text-sm text-gray-400">Reach out to us and we&rsquo;ll get back to you by email.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((t) => (
            <button
              key={t.id}
              onClick={() => setSelectedId(t.id)}
              className={`w-full rounded-lg border p-4 text-left transition-colors ${
                selectedId === t.id
                  ? "border-pink-500 bg-pink-50/50"
                  : "border-gray-200 hover:border-pink-300"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="min-w-0">
                  <p className="font-medium text-gray-900 truncate">{t.subject}</p>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {t.ticketNumber}
                    {t.orderId ? ` · Order #${t.orderId}` : ""}
                  </p>
                </div>
                <span className={`inline-block shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${statusColors[t.status] || "bg-gray-100 text-gray-700"}`}>
                  {t.status.replace(/_/g, " ")}
                </span>
              </div>
              {t.lastActivity && (
                <p className="mt-2 text-xs text-gray-400">
                  Last activity {new Date(t.lastActivity).toLocaleString("en-IN")}
                </p>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}