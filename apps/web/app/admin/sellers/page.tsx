"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import { DataTable, Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";

interface SellerRow {
  id: number;
  sellername: string | null;
  mobile: string | null;
  email: string | null;
  isActive: boolean;
  createdAt: string;
  _count: { product: number };
}

export default function AdminSellersPage() {
  const queryClient = useQueryClient();
  const [pendingToggle, setPendingToggle] = useState<SellerRow | null>(null);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["admin-sellers"],
    queryFn: () => adminApi.sellers(),
  });

  const statusMutation = useMutation({
    mutationFn: (args: { id: number; isActive: boolean }) =>
      adminApi.updateSellerStatus(args.id, args.isActive),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-sellers"] }),
  });

  const sellers: SellerRow[] = data?.sellers || [];

  const handleToggle = (s: SellerRow) => {
    if (s.isActive) {
      setPendingToggle(s);
      return;
    }
    statusMutation.mutate({ id: s.id, isActive: true });
  };

  const confirmDeactivate = () => {
    if (pendingToggle) {
      statusMutation.mutate({ id: pendingToggle.id, isActive: false });
      setPendingToggle(null);
    }
  };

  const columns: Column<SellerRow>[] = [
    { key: "id", header: "ID", className: "w-16" },
    {
      key: "sellername",
      header: "Seller",
      render: (s) => (
        <div>
          <p className="font-medium text-gray-900">{s.sellername || "N/A"}</p>
          <p className="text-xs text-gray-500">{s.email}</p>
        </div>
      ),
    },
    {
      key: "mobile",
      header: "Mobile",
      render: (s) => <span>{s.mobile || "N/A"}</span>,
    },
    {
      key: "products",
      header: "Products",
      render: (s) => <span>{s._count.product}</span>,
    },
    {
      key: "isActive",
      header: "Status",
      render: (s) => (
        <Button
          variant="outline"
          size="sm"
          className={s.isActive ? "text-green-600 border-green-600" : "text-red-600 border-red-600"}
          onClick={() => handleToggle(s)}
        >
          {s.isActive ? "Active" : "Inactive"}
        </Button>
      ),
    },
    {
      key: "createdAt",
      header: "Joined",
      render: (s) => (
        <span className="text-gray-500">
          {s.createdAt ? new Date(s.createdAt).toLocaleDateString("en-IN") : "N/A"}
        </span>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Seller Management</h1>
      {isError && (
        <p className="text-red-500 text-center py-4">Unable to load sellers.</p>
      )}
      <DataTable
        columns={columns}
        data={sellers}
        loading={isLoading}
        emptyMessage="No sellers found."
        keyExtractor={(s) => s.id}
      />

      <ConfirmDialog
        open={!!pendingToggle}
        onOpenChange={(open) => {
          if (!open) setPendingToggle(null);
        }}
        title="Deactivate this seller?"
        description={
          pendingToggle
            ? `Are you sure you want to deactivate ${pendingToggle.sellername || `seller #${pendingToggle.id}`}? They will no longer be able to manage their products and orders.`
            : undefined
        }
        confirmLabel="Deactivate"
        destructive
        isLoading={statusMutation.isPending}
        onConfirm={confirmDeactivate}
      />
    </div>
  );
}
