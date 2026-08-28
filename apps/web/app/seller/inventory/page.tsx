"use client";

import { useQuery } from "@tanstack/react-query";
import { sellerApi } from "@/lib/api";
import { formatPrice, getProductImageUrl } from "@/lib/utils";
import { StatCard, StatusBadge } from "@/components/dashboard";
import { Card, CardContent } from "@/components/ui/card";
import { Package, AlertTriangle, XCircle, Boxes } from "lucide-react";

interface InventoryItem {
  id: number;
  name: string;
  ptype: string;
  price: number;
  image: string | null;
  sizes: { size: string; quantity: number }[];
  total: number;
  status: "in_stock" | "low_stock" | "out_of_stock";
}

const statusLabels: Record<string, string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
};

export default function SellerInventoryPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["seller-inventory"],
    queryFn: () => sellerApi.inventory(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
      </div>
    );
  }

  const items: InventoryItem[] = data?.items || [];
  const summary = data?.summary || {};
  const threshold = data?.threshold ?? 5;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
        <p className="text-sm text-gray-500">Low-stock threshold: {threshold}</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          label="Total Products"
          value={summary.total ?? 0}
          icon={<Package className="h-5 w-5" />}
          accent="pink"
        />
        <StatCard
          label="In Stock"
          value={summary.inStock ?? 0}
          icon={<Boxes className="h-5 w-5" />}
          accent="green"
        />
        <StatCard
          label="Low Stock"
          value={summary.lowStock ?? 0}
          icon={<AlertTriangle className="h-5 w-5" />}
          accent="yellow"
        />
        <StatCard
          label="Out of Stock"
          value={summary.outOfStock ?? 0}
          icon={<XCircle className="h-5 w-5" />}
          accent="red"
        />
      </div>

      <Card>
        <CardContent className="p-0">
          {items.length === 0 ? (
            <p className="text-gray-500 text-center py-10">No products in inventory.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-gray-50 text-left">
                    <th className="px-4 py-3 font-medium text-gray-500">Product</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Size &amp; Quantity</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Total</th>
                    <th className="px-4 py-3 font-medium text-gray-500">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                            <img
                              src={getProductImageUrl(item.image)}
                              alt={item.name}
                              className="h-full w-full object-cover"
                            />
                          </div>
                          <div>
                            <p className="font-medium text-gray-900 truncate max-w-[200px]">{item.name}</p>
                            <p className="text-xs text-gray-500">{item.ptype} · {formatPrice(item.price || 0)}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {item.sizes.length > 0 ? (
                            item.sizes.map((s) => (
                              <span
                                key={s.size}
                                className="rounded border border-gray-200 px-2 py-0.5 text-xs text-gray-700"
                              >
                                {s.size}: {s.quantity}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">No size-specific stock</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-medium text-gray-900">{item.total}</td>
                      <td className="px-4 py-3">
                        <StatusBadge status={statusLabels[item.status] || item.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
