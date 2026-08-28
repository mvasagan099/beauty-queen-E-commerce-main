"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import { DataTable, Column } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";

interface UserRow {
  id: number;
  email: string;
  name: string | null;
  phone: string | null;
  role: string;
  createdAt: string;
  _count: { orders: number; cartItems: number };
}

export default function AdminUsersPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: () => adminApi.users(),
  });

  const roleMutation = useMutation({
    mutationFn: (args: { id: number; role: string }) =>
      adminApi.updateUserRole(args.id, args.role),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-users"] }),
  });

  const users: UserRow[] = data?.users || [];

  const columns: Column<UserRow>[] = [
    { key: "id", header: "ID", className: "w-16" },
    {
      key: "email",
      header: "User",
      render: (u) => (
        <div>
          <p className="font-medium text-gray-900">{u.name || "N/A"}</p>
          <p className="text-xs text-gray-500">{u.email}</p>
        </div>
      ),
    },
    {
      key: "role",
      header: "Role",
      render: (u) => (
        <select
          value={u.role}
          onChange={(e) => roleMutation.mutate({ id: u.id, role: e.target.value })}
          className="h-8 rounded border border-input bg-background px-2 text-xs"
        >
          <option value="CUSTOMER">Customer</option>
          <option value="SELLER">Seller</option>
          <option value="ADMIN">Admin</option>
        </select>
      ),
    },
    {
      key: "orders",
      header: "Orders",
      render: (u) => <span>{u._count.orders}</span>,
    },
    {
      key: "createdAt",
      header: "Joined",
      render: (u) => (
        <span className="text-gray-500">
          {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN") : "N/A"}
        </span>
      ),
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">User Management</h1>
      <DataTable
        columns={columns}
        data={users}
        loading={isLoading}
        emptyMessage="No users found."
        keyExtractor={(u) => u.id}
      />
    </div>
  );
}
