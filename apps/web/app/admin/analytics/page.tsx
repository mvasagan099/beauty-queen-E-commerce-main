"use client";

import { useState } from "react";
import {
  useAdminOverview,
  useAdminSales,
  useAdminOrders,
  useAdminProducts,
  ANALYTICS_RANGE_OPTIONS,
  type AnalyticsRange,
} from "@/hooks/use-analytics";
import { StatCard, BarChart, StatusBadge } from "@/components/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatPrice } from "@/lib/utils";
import {
  TrendingUp,
  ShoppingCart,
  Package,
  Users,
  Store,
  AlertTriangle,
  ClipboardList,
} from "lucide-react";

const ORDER_COLORS: Record<string, string> = {
  Pending: "#f59e0b",
  Confirmed: "#3b82f6",
  Processing: "#6366f1",
  Shipped: "#a855f7",
  Delivered: "#22c55e",
  Cancelled: "#ef4444",
  Refunded: "#f97316",
};

const PAYMENT_COLORS: Record<string, string> = {
  Pending: "#f59e0b",
  Completed: "#22c55e",
  Failed: "#ef4444",
  Refunded: "#f97316",
};

export default function AdminAnalyticsPage() {
  const [range, setRange] = useState<AnalyticsRange>("30d");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");

  const rangeArgs: [AnalyticsRange, string, string] = [range, from, to];
  const overview = useAdminOverview(...rangeArgs);
  const sales = useAdminSales(...rangeArgs);
  const orders = useAdminOrders(...rangeArgs);
  const products = useAdminProducts(...rangeArgs);

  const isLoading =
    overview.isLoading || sales.isLoading || orders.isLoading || products.isLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
      </div>
    );
  }

  if (overview.isError || sales.isError || orders.isError || products.isError) {
    return (
      <div className="rounded-lg border bg-white p-8 text-center">
        <p className="text-gray-500">Unable to load analytics. Please try again.</p>
      </div>
    );
  }

  const ov = overview.data?.data || {};
  const sa = sales.data?.data || {};
  const od = orders.data?.data || {};
  const pr = products.data?.data || {};

  const byStatus = ov.orders?.byStatus || {};
  const byPayment = ov.orders?.byPayment || {};

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Analytics</h1>
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={range}
            onChange={(e) => setRange(e.target.value as AnalyticsRange)}
            className="h-10 rounded-md border border-input bg-background px-3 text-sm"
          >
            {ANALYTICS_RANGE_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
          {range === "custom" && (
            <>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-2 text-sm"
              />
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="h-10 rounded-md border border-input bg-background px-2 text-sm"
              />
            </>
          )}
        </div>
      </div>

      {/* Overview stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Revenue"
          value={formatPrice(Number(sa.revenue) || 0)}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="green"
        />
        <StatCard
          label="Orders"
          value={sa.orders ?? 0}
          icon={<ShoppingCart className="h-5 w-5" />}
          accent="blue"
        />
        <StatCard
          label="Avg. Order Value"
          value={formatPrice(Number(sa.averageOrderValue) || 0)}
          icon={<ClipboardList className="h-5 w-5" />}
          accent="purple"
        />
        <StatCard
          label="Products Sold"
          value={sa.productsSold ?? 0}
          icon={<Package className="h-5 w-5" />}
          accent="pink"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Customers"
          value={ov.customers ?? 0}
          icon={<Users className="h-5 w-5" />}
          accent="orange"
        />
        <StatCard
          label="Total Sellers"
          value={ov.sellers ?? 0}
          icon={<Store className="h-5 w-5" />}
          accent="blue"
        />
        <StatCard
          label="Low Stock"
          value={ov.products?.lowStock ?? 0}
          hint={`Threshold: ${ov.products?.lowStockThreshold ?? 5}`}
          icon={<AlertTriangle className="h-5 w-5" />}
          accent="yellow"
        />
        <StatCard
          label="Out of Stock"
          value={ov.products?.outOfStock ?? 0}
          icon={<AlertTriangle className="h-5 w-5" />}
          accent="red"
        />
      </div>

      {/* Payment breakdown */}
      <div className="grid gap-6 lg:grid-cols-2 mb-8">
        <Card>
          <CardHeader>
            <CardTitle>Payment Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex gap-2 flex-wrap">
              {Object.entries(byPayment).map(([status, count]) => (
                <StatusBadge key={status} status={status} />
              ))}
            </div>
            <BarChart
              data={Object.entries(byPayment).map(([label, value]) => ({
                label,
                value: value as number,
                color: PAYMENT_COLORS[label],
              }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Products by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <BarChart
              data={(pr.byCategory || []).map((c: any) => ({
                label: c.category,
                value: c.count,
              }))}
            />
          </CardContent>
        </Card>
      </div>

      {/* Order status */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle>Orders by Status</CardTitle>
        </CardHeader>
        <CardContent>
          <BarChart
            data={Object.entries(byStatus).map(([label, value]) => ({
              label,
              value: value as number,
              color: ORDER_COLORS[label],
            }))}
          />
        </CardContent>
      </Card>

      {/* Top selling products */}
      <Card>
        <CardHeader>
          <CardTitle>Top Selling Products</CardTitle>
        </CardHeader>
        <CardContent>
          {pr.topSelling && pr.topSelling.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-gray-500">Product</th>
                    <th className="pb-3 font-medium text-gray-500">Category</th>
                    <th className="pb-3 font-medium text-gray-500">Units Sold</th>
                  </tr>
                </thead>
                <tbody>
                  {(pr.topSelling as any[]).map((t) => (
                    <tr key={t.product?.id} className="border-b last:border-0">
                      <td className="py-3 font-medium text-gray-900">
                        {t.product?.name || "N/A"}
                      </td>
                      <td className="py-3">{t.product?.ptype || "-"}</td>
                      <td className="py-3">{t.unitsSold}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No sales data yet.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
