"use client";

import { useQuery } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import { Product } from "@/types";
import { formatPrice } from "@/lib/utils";
import { DataTable, Column } from "@/components/ui/data-table";

export default function AdminProductsPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-products"],
    queryFn: () => adminApi.products(),
  });

  const products: Product[] = data?.products || [];

  const columns: Column<Product>[] = [
    {
      key: "id",
      header: "ID",
      className: "w-16",
    },
    {
      key: "name",
      header: "Product",
      render: (p) => (
        <div>
          <p className="font-medium text-gray-900 truncate max-w-[200px]">{p.name}</p>
          <p className="text-xs text-gray-500">{p.ptype}</p>
        </div>
      ),
    },
    {
      key: "price",
      header: "Price",
      render: (p) => <span className="font-medium text-pink-500">{formatPrice(p.price || 0)}</span>,
    },
    {
      key: "mrp",
      header: "MRP",
      render: (p) => <span className="text-gray-500">{formatPrice(p.mrp || 0)}</span>,
    },
    {
      key: "stock",
      header: "Stock",
      render: (p) => {
        const total = (p.sizeS || 0) + (p.sizeM || 0) + (p.sizeL || 0) + (p.sizeXl || 0) + (p.sizeXxl || 0);
        return <span className={total > 0 ? "text-green-600" : "text-red-500"}>{total}</span>;
      },
    },
    {
      key: "sellerId",
      header: "Seller",
      render: (p) => <span className="text-gray-500">{p.sellerId || "N/A"}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (p) =>
        p.deletedAt ? (
          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Deleted</span>
        ) : (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Active</span>
        ),
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-gray-900 mb-6">All Products</h1>
      <DataTable
        columns={columns}
        data={products}
        loading={isLoading}
        emptyMessage="No products found."
        keyExtractor={(p) => p.id}
      />
    </div>
  );
}
