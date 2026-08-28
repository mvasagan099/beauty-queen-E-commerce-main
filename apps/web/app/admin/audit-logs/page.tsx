"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { adminApi } from "@/lib/api";

interface AuditLogItem {
  id: number;
  action: string;
  entityType: string;
  entityId: number | null;
  actorId: number | null;
  actorRole: string | null;
  details: Record<string, unknown> | null;
  createdAt: string;
}

const actionColors: Record<string, string> = {
  PRODUCT_CREATED: "bg-green-100 text-green-700",
  PRODUCT_UPDATED: "bg-blue-100 text-blue-700",
  PRODUCT_DELETED: "bg-red-100 text-red-700",
  PRODUCT_RESTORED: "bg-yellow-100 text-yellow-700",
  ORDER_STATUS_CHANGED: "bg-purple-100 text-purple-700",
  ORDER_DELETED: "bg-red-100 text-red-700",
  USER_STATUS_CHANGED: "bg-blue-100 text-blue-700",
  USER_ROLE_CHANGED: "bg-indigo-100 text-indigo-700",
  SELLER_STATUS_CHANGED: "bg-orange-100 text-orange-700",
  RETURN_APPROVED: "bg-green-100 text-green-700",
  RETURN_REJECTED: "bg-red-100 text-red-700",
  REFUND_CREATED: "bg-yellow-100 text-yellow-700",
};

export default function AdminAuditLogsPage() {
  const [actionFilter, setActionFilter] = useState("");
  const [entityFilter, setEntityFilter] = useState("");
  const [actorFilter, setActorFilter] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-audit-logs", actionFilter, entityFilter, actorFilter, page],
    queryFn: () =>
      adminApi.auditLogs({
        action: actionFilter || undefined,
        entityType: entityFilter || undefined,
        actorRole: actorFilter || undefined,
        page,
        limit: 20,
      }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
      </div>
    );
  }

  const logs: AuditLogItem[] = data?.logs || [];
  const pagination = data?.pagination;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Audit Logs</h1>

      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <select
          value={actionFilter}
          onChange={(e) => { setActionFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All Actions</option>
          {Object.keys(actionColors).map((a) => (
            <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
          ))}
        </select>
        <select
          value={entityFilter}
          onChange={(e) => { setEntityFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All Entities</option>
          {["Product", "Order", "User", "Seller", "ReturnRequest", "Refund"].map((e) => (
            <option key={e} value={e}>{e}</option>
          ))}
        </select>
        <select
          value={actorFilter}
          onChange={(e) => { setActorFilter(e.target.value); setPage(1); }}
          className="h-10 rounded-md border border-input bg-background px-3 text-sm"
        >
          <option value="">All Actors</option>
          {["ADMIN", "SELLER", "CUSTOMER"].map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
      </div>

      {isError && (
        <p className="text-red-500 text-center py-4">Unable to load audit logs.</p>
      )}

      {logs.length === 0 ? (
        <p className="text-gray-500 text-center py-8">No audit logs found.</p>
      ) : (
        <div className="space-y-3">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${actionColors[log.action] || "bg-gray-100 text-gray-700"}`}>
                    {log.action.replace(/_/g, " ")}
                  </span>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-900">
                      <span className="font-medium">{log.entityType}</span>
                      {log.entityId ? ` #${log.entityId}` : ""}
                    </p>
                    {log.details && Object.keys(log.details).length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        {Object.entries(log.details)
                          .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : v}`)
                          .join(" · ")}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-xs text-gray-400">
                    <p>{log.actorRole || "System"}</p>
                    <p>{new Date(log.createdAt).toLocaleString("en-IN")}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-6">
          <button
            onClick={() => setPage(Math.max(1, page - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded border text-sm disabled:opacity-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {pagination.page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage(Math.min(pagination.totalPages, page + 1))}
            disabled={page === pagination.totalPages}
            className="px-3 py-1 rounded border text-sm disabled:opacity-50"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
