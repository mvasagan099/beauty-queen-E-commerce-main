"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { sellerApi, productsApi } from "@/lib/api";
import { Product } from "@/types";
import { formatPrice, getProductImageUrl } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SearchBar, Pagination } from "@/components/dashboard";
import Link from "next/link";
import { Plus } from "lucide-react";

export default function SellerProductsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["seller-products", page, searchQuery],
    queryFn: () =>
      sellerApi.products({
        page,
        limit: 20,
        search: searchQuery || undefined,
      }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => productsApi.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seller-products"] }),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: number) => productsApi.restore(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["seller-products"] }),
  });

  const products: Product[] = data?.products || [];
  const pagination = data?.pagination;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-900">Products</h1>
        <Link href="/seller/add-product">
          <Button className="bg-pink-500 hover:bg-pink-600 text-white">
            <Plus className="h-4 w-4 mr-2" /> Add Product
          </Button>
        </Link>
      </div>

      <div className="mb-6">
        <SearchBar
          value={searchQuery}
          onChange={(v) => {
            setSearchQuery(v);
            setPage(1);
          }}
          placeholder="Search products..."
          className="sm:w-80"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
        </div>
      ) : products.length === 0 ? (
        <div className="rounded-lg border bg-white p-8 text-center">
          <p className="text-gray-500">
            No products found. Create your first product!
          </p>
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-lg border bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium text-gray-500 w-12"></th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Product</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Price</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Stock</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500"></th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => {
                  const total =
                    (p.sizeS || 0) +
                    (p.sizeM || 0) +
                    (p.sizeL || 0) +
                    (p.sizeXl || 0) +
                    (p.sizeXxl || 0);
                  return (
                    <tr key={p.id} className="border-b last:border-0 hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="h-10 w-10 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                          <img
                            src={getProductImageUrl(p.image || p.image1)}
                            alt={p.name || ""}
                            className="h-full w-full object-cover"
                          />
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium text-gray-900 truncate max-w-[200px]">{p.name}</p>
                        <p className="text-xs text-gray-500">{p.ptype}</p>
                      </td>
                      <td className="px-4 py-3 font-medium text-pink-500">
                        {formatPrice(p.price || 0)}
                      </td>
                      <td className="px-4 py-3">
                        <span className={total > 0 ? "text-green-600" : "text-red-500"}>{total}</span>
                      </td>
                      <td className="px-4 py-3">
                        {p.deletedAt ? (
                          <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs text-red-700">Deleted</span>
                        ) : (
                          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">Active</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-2 justify-end">
                          <Link href={`/seller/edit-product/${p.id}`}>
                            <Button variant="outline" size="sm">Edit</Button>
                          </Link>
                          {p.deletedAt ? (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-green-600 border-green-600"
                              onClick={() => restoreMutation.mutate(p.id)}
                            >
                              Restore
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-red-600 border-red-600"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this product?")) {
                                  deleteMutation.mutate(p.id);
                                }
                              }}
                            >
                              Delete
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <Pagination pagination={pagination} onPageChange={setPage} />
        </>
      )}
    </div>
  );
}
