"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi, downloadExport, ExportResource } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { StatCard, BarChart, StatusBadge } from "@/components/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Package,
  ShoppingCart,
  Users,
  Store,
  Clock,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Download,
} from "lucide-react";
import Link from "next/link";

const ORDER_COLORS: Record<string, string> = {
  Pending: "#f59e0b",
  Confirmed: "#3b82f6",
  Processing: "#6366f1",
  Shipped: "#a855f7",
  Delivered: "#22c55e",
  Cancelled: "#ef4444",
  Refunded: "#f97316",
};

const EXPORT_LABELS: { resource: ExportResource; label: string }[] = [
  { resource: "orders", label: "Orders" },
  { resource: "products", label: "Products" },
  { resource: "customers", label: "Customers" },
  { resource: "refunds", label: "Refunds" },
  { resource: "sales", label: "Sales" },
];

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-dashboard"],
    queryFn: () => adminApi.dashboard(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
      </div>
    );
  }

  const stats = data || {};
  const orderStatus = stats.orderStatus || {};

  const handleExport = async (resource: ExportResource) => {
    try {
      await downloadExport(resource);
      toast.success(`${resource} export downloaded`);
    } catch (err) {
      toast.error((err as Error).message || "Export failed");
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Admin Dashboard</h1>
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Download className="h-4 w-4 text-gray-400" />
            {EXPORT_LABELS.map((e) => (
              <button
                key={e.resource}
                onClick={() => handleExport(e.resource)}
                className="rounded-md border border-gray-200 px-2 py-1.5 text-xs font-medium text-gray-600 hover:border-pink-300 hover:text-pink-600"
                title={`Export ${e.label} as CSV`}
              >
                {e.label}
              </button>
            ))}
          </div>
          <Link
            href="/admin/analytics"
            className="rounded-md bg-pink-500 px-4 py-2 text-sm font-medium text-white hover:bg-pink-600"
          >
            View Analytics
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        <StatCard
          label="Total Products"
          value={stats.totalProducts || 0}
          icon={<Package className="h-5 w-5" />}
          accent="pink"
        />
        <StatCard
          label="Total Orders"
          value={stats.totalOrders || 0}
          icon={<ShoppingCart className="h-5 w-5" />}
          accent="blue"
        />
        <StatCard
          label="Pending Orders"
          value={stats.pendingOrders || 0}
          icon={<Clock className="h-5 w-5" />}
          accent="yellow"
        />
        <StatCard
          label="Total Revenue"
          value={formatPrice(Number(stats.totalRevenue) || 0)}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="green"
        />
        <StatCard
          label="Total Customers"
          value={stats.totalUsers || 0}
          icon={<Users className="h-5 w-5" />}
          accent="purple"
        />
        <StatCard
          label="Total Sellers"
          value={stats.totalSellers || 0}
          icon={<Store className="h-5 w-5" />}
          accent="orange"
        />
        <StatCard
          label="Paid Orders"
          value={stats.paidOrders ?? 0}
          icon={<CheckCircle2 className="h-5 w-5" />}
          accent="green"
        />
        <StatCard
          label="Failed Payments"
          value={stats.failedPayments ?? 0}
          icon={<XCircle className="h-5 w-5" />}
          accent="red"
        />
        <StatCard
          label="Low Stock Products"
          value={stats.lowStockProducts ?? 0}
          icon={<AlertTriangle className="h-5 w-5" />}
          accent="yellow"
        />
      </div>

      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Orders by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="mb-4 gap-2 flex flex-wrap">
            {Object.entries(orderStatus).map(([status, count]) => (
              <StatusBadge key={status} status={status} />
            ))}
          </div>
          <BarChart
            data={Object.entries(orderStatus).map(([label, value]) => ({
              label,
              value: value as number,
              color: ORDER_COLORS[label],
            }))}
          />
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Link
          href="/admin/products"
          className="rounded-lg border bg-white p-4 text-center hover:shadow-md transition-shadow"
        >
          <Package className="h-6 w-6 mx-auto mb-2 text-pink-500" />
          <p className="font-medium text-gray-900">Manage Products</p>
        </Link>
        <Link
          href="/admin/orders"
          className="rounded-lg border bg-white p-4 text-center hover:shadow-md transition-shadow"
        >
          <ShoppingCart className="h-6 w-6 mx-auto mb-2 text-blue-500" />
          <p className="font-medium text-gray-900">Manage Orders</p>
        </Link>
        <Link
          href="/admin/sellers"
          className="rounded-lg border bg-white p-4 text-center hover:shadow-md transition-shadow"
        >
          <Store className="h-6 w-6 mx-auto mb-2 text-orange-500" />
          <p className="font-medium text-gray-900">Manage Sellers</p>
        </Link>
        <Link
          href="/admin/users"
          className="rounded-lg border bg-white p-4 text-center hover:shadow-md transition-shadow"
        >
          <Users className="h-6 w-6 mx-auto mb-2 text-purple-500" />
          <p className="font-medium text-gray-900">Manage Users</p>
        </Link>
      </div>
    </div>
  );
}
