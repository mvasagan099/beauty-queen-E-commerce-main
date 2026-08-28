"use client";

import { useQuery } from "@tanstack/react-query";
import { sellerApi } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { StatCard, StatusBadge } from "@/components/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Order } from "@/types";
import Link from "next/link";
import { Package, ShoppingCart, Clock, TrendingUp, Boxes } from "lucide-react";

export default function SellerDashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["seller-dashboard"],
    queryFn: () => sellerApi.dashboard(),
  });

  const { data: inventoryData, isLoading: inventoryLoading } = useQuery({
    queryKey: ["seller-inventory-summary"],
    queryFn: () => sellerApi.inventory(),
  });

  if (isLoading || inventoryLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
      </div>
    );
  }

  const stats = data || {};
  const lowStock = inventoryData?.summary?.lowStock || 0;
  const outOfStock = inventoryData?.summary?.outOfStock || 0;

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Seller Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
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
          label="Revenue"
          value={formatPrice(Number(stats.totalRevenue) || 0)}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="green"
        />
        <StatCard
          label="Units Sold"
          value={stats.unitsSold || 0}
          icon={<Package className="h-5 w-5" />}
          accent="purple"
        />
        <StatCard
          label="Total Stock"
          value={stats.totalStock || 0}
          icon={<Boxes className="h-5 w-5" />}
          accent="blue"
        />
        <StatCard
          label="Low Stock"
          value={lowStock}
          icon={<Boxes className="h-5 w-5" />}
          accent="yellow"
        />
        <StatCard
          label="Out of Stock"
          value={outOfStock}
          icon={<Package className="h-5 w-5" />}
          accent="red"
        />
        <StatCard
          label="Delivered"
          value={stats.deliveredOrders || 0}
          icon={<TrendingUp className="h-5 w-5" />}
          accent="green"
        />
        <StatCard
          label="Cancelled"
          value={stats.cancelledOrders || 0}
          icon={<Clock className="h-5 w-5" />}
          accent="red"
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Link
          href="/seller/products"
          className="rounded-lg border bg-white p-4 text-center hover:shadow-md transition-shadow"
        >
          <Package className="h-6 w-6 mx-auto mb-2 text-pink-500" />
          <p className="font-medium text-gray-900">Manage Products</p>
        </Link>
        <Link
          href="/seller/add-product"
          className="rounded-lg border bg-white p-4 text-center hover:shadow-md transition-shadow"
        >
          <Package className="h-6 w-6 mx-auto mb-2 text-green-500" />
          <p className="font-medium text-gray-900">Add Product</p>
        </Link>
        <Link
          href="/seller/orders"
          className="rounded-lg border bg-white p-4 text-center hover:shadow-md transition-shadow"
        >
          <ShoppingCart className="h-6 w-6 mx-auto mb-2 text-blue-500" />
          <p className="font-medium text-gray-900">Manage Orders</p>
        </Link>
        <Link
          href="/seller/inventory"
          className="rounded-lg border bg-white p-4 text-center hover:shadow-md transition-shadow"
        >
          <Boxes className="h-6 w-6 mx-auto mb-2 text-orange-500" />
          <p className="font-medium text-gray-900">Inventory</p>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {stats.recentOrders && stats.recentOrders.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left">
                    <th className="pb-3 font-medium text-gray-500">Order ID</th>
                    <th className="pb-3 font-medium text-gray-500">Customer</th>
                    <th className="pb-3 font-medium text-gray-500">Product</th>
                    <th className="pb-3 font-medium text-gray-500">Amount</th>
                    <th className="pb-3 font-medium text-gray-500">Status</th>
                    <th className="pb-3 font-medium text-gray-500">Date</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.recentOrders.map((order: Order) => (
                    <tr key={order.id} className="border-b last:border-0">
                      <td className="py-3">#{order.id}</td>
                      <td className="py-3">{order.username || order.email || "N/A"}</td>
                      <td className="py-3">{order.name || "N/A"}</td>
                      <td className="py-3 font-medium">
                        {formatPrice(Number(order.subtotal) || 0)}
                      </td>
                      <td className="py-3">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="py-3 text-gray-500">
                        {order.orderDate
                          ? new Date(order.orderDate).toLocaleDateString("en-IN")
                          : "N/A"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 text-center py-4">No recent orders.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
