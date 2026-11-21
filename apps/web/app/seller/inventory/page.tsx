"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, sellerApi } from "@/lib/api";
import { formatPrice, getProductImageUrl } from "@/lib/utils";
import { StatCard, StatusBadge } from "@/components/dashboard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Package, AlertTriangle, XCircle, Boxes, Upload, Download } from "lucide-react";
import { toast } from "sonner";

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

function parseBulkCsv(text: string): { productId: number; size: string; quantity: number }[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  const updates: { productId: number; size: string; quantity: number }[] = [];

  for (const line of lines) {
    if (line.toLowerCase().startsWith("productid")) continue;
    const cols = line.split(",").map((c) => c.trim());
    if (cols.length < 3) continue;
    const productId = Number(cols[0]);
    const size = cols[1];
    const quantity = Number(cols[2]);
    if (Number.isInteger(productId) && productId > 0 && size && Number.isInteger(quantity) && quantity >= 0) {
      updates.push({ productId, size, quantity });
    }
  }
  return updates;
}

export default function SellerInventoryPage() {
  const queryClient = useQueryClient();
  const [bulkOpen, setBulkOpen] = useState(false);
  const [csvText, setCsvText] = useState("");
  const [bulkResult, setBulkResult] = useState<{
    updatedCount: number;
    failedCount: number;
    errors: { index: number; productId: number; size: string; reason: string }[];
  } | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["seller-inventory"],
    queryFn: () => sellerApi.inventory(),
  });

  const bulkMutation = useMutation({
    mutationFn: (updates: { productId: number; size: string; quantity: number }[]) =>
      api.post("/inventory/bulk", { updates }),
    onSuccess: (res) => {
      setBulkResult({
        updatedCount: res.updatedCount ?? 0,
        failedCount: res.failedCount ?? 0,
        errors: res.errors || [],
      });
      queryClient.invalidateQueries({ queryKey: ["seller-inventory"] });
      toast.success(`Updated ${res.updatedCount ?? 0} stock entries`);
    },
    onError: (err: Error) => toast.error(err.message || "Bulk update failed"),
  });

  const handleDownloadCsv = async () => {
    const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";
    const token = typeof window !== "undefined" ? localStorage.getItem("seller_access_token") : null;
    try {
      const res = await fetch(`${apiBase}/inventory/export`, {
        credentials: "include",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) throw new Error("Export failed");
      const csv = await res.text();
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "beauty-queen-inventory.csv";
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Inventory CSV downloaded");
    } catch {
      toast.error("Could not export inventory CSV");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setCsvText(String(reader.result || ""));
    };
    reader.readAsText(file);
  };

  const parsedPreview = parseBulkCsv(csvText);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  const items: InventoryItem[] = data?.items || [];
  const summary = data?.summary || {};
  const threshold = data?.threshold ?? 5;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Inventory</h1>
          <p className="text-sm text-gray-500 mt-0.5">Low-stock threshold: {threshold}</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleDownloadCsv} className="gap-1.5">
            <Download className="h-4 w-4" />
            Export CSV
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={() => setBulkOpen((o) => !o)}
            className="gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground"
          >
            <Upload className="h-4 w-4" />
            {bulkOpen ? "Close Bulk Update" : "Bulk CSV Update"}
          </Button>
        </div>
      </div>

      {bulkOpen && (
        <Card className="mb-8 border-primary/20">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Bulk Stock Update (CSV)</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-xs text-muted-foreground">
              Upload a CSV file or paste rows in <code className="rounded bg-muted px-1 py-0.5">productId,size,quantity</code> format. Supported sizes: <code className="rounded bg-muted px-1 py-0.5">S, M, L, XL, XXL, FREE_SIZE</code>.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileUpload}
                className="text-xs text-muted-foreground"
              />
            </div>
            <textarea
              rows={5}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder={"productId,size,quantity\n12,M,25\n12,L,18\n15,FREE_SIZE,40"}
              className="w-full rounded-md border border-input bg-background p-3 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-ring"
            />
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="text-xs text-muted-foreground tabular-nums">
                {parsedPreview.length} valid row{parsedPreview.length === 1 ? "" : "s"} detected
              </span>
              <Button
                type="button"
                size="sm"
                disabled={parsedPreview.length === 0 || bulkMutation.isPending}
                onClick={() => bulkMutation.mutate(parsedPreview)}
              >
                {bulkMutation.isPending
                  ? "Applying..."
                  : `Apply ${parsedPreview.length} Update${parsedPreview.length === 1 ? "" : "s"}`}
              </Button>
            </div>
            {bulkResult && (
              <div className="rounded-md border border-border bg-muted/40 p-3 text-xs space-y-1">
                <p className="font-medium text-foreground">
                  Updated: {bulkResult.updatedCount} · Failed: {bulkResult.failedCount}
                </p>
                {bulkResult.errors.slice(0, 5).map((err) => (
                  <p key={`${err.index}-${err.productId}`} className="text-destructive">
                    Row {err.index + 1} (Product #{err.productId}, {err.size}): {err.reason}
                  </p>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

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
                            <p className="text-xs text-gray-500">#{item.id} · {item.ptype} · {formatPrice(item.price || 0)}</p>
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
                            <span className="text-xs text-gray-400">Free Size / General: {item.total}</span>
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
