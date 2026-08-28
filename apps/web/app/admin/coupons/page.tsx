"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CouponData } from "@/types";

interface CouponForm {
  code: string;
  type: string;
  discount: string;
  minPurchase: string;
  maxDiscount: string;
  usageLimit: string;
  perUserLimit: string;
  expiresAt: string;
  active: boolean;
}

export default function AdminCouponsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [form, setForm] = useState({
    code: "",
    type: "PERCENTAGE" as "PERCENTAGE" | "FIXED_AMOUNT",
    discount: "",
    minPurchase: "",
    maxDiscount: "",
    usageLimit: "",
    perUserLimit: "1",
    expiresAt: "",
    active: true,
  });
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["admin-coupons", searchQuery],
    queryFn: () => api.get(`/coupons?search=${searchQuery}`),
  });

  const createMutation = useMutation({
    mutationFn: (data: Record<string, unknown>) => api.post("/coupons/admin", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-coupons"] });
      setShowCreate(false);
      setForm({
        code: "", type: "PERCENTAGE", discount: "", minPurchase: "",
        maxDiscount: "", usageLimit: "", perUserLimit: "1", expiresAt: "", active: true,
      });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => api.delete(`/coupons/admin/${id}`),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-coupons"] }),
  });

  const toggleMutation = useMutation({
    mutationFn: (args: { id: number; active: boolean }) =>
      api.patch(`/coupons/admin/${args.id}`, { active: args.active }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin-coupons"] }),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
      </div>
    );
  }

  const coupons = data?.coupons || [];

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Coupon Management</h1>
        <Button className="bg-pink-500 hover:bg-pink-600 text-white" onClick={() => setShowCreate(!showCreate)}>
          {showCreate ? "Cancel" : "Create Coupon"}
        </Button>
      </div>

      {showCreate && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Create New Coupon</CardTitle>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                createMutation.mutate({
                  code: form.code,
                  type: form.type,
                  discount: Number(form.discount),
                  minPurchase: form.minPurchase ? Number(form.minPurchase) : 0,
                  maxDiscount: form.maxDiscount ? Number(form.maxDiscount) : undefined,
                  usageLimit: form.usageLimit ? Number(form.usageLimit) : undefined,
                  perUserLimit: Number(form.perUserLimit),
                  expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : "",
                  active: form.active,
                });
              }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              <div className="space-y-2">
                <Label>Code</Label>
                <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} placeholder="SAVE10" required />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "PERCENTAGE" | "FIXED_AMOUNT" })} className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
                  <option value="PERCENTAGE">Percentage</option>
                  <option value="FIXED_AMOUNT">Fixed Amount</option>
                </select>
              </div>
              <div className="space-y-2">
                <Label>Discount {form.type === "PERCENTAGE" ? "(%)" : "(₹)"}</Label>
                <Input type="number" value={form.discount} onChange={(e) => setForm({ ...form, discount: e.target.value })} required min="0" />
              </div>
              <div className="space-y-2">
                <Label>Min Purchase (₹)</Label>
                <Input type="number" value={form.minPurchase} onChange={(e) => setForm({ ...form, minPurchase: e.target.value })} min="0" />
              </div>
              <div className="space-y-2">
                <Label>Max Discount (₹)</Label>
                <Input type="number" value={form.maxDiscount} onChange={(e) => setForm({ ...form, maxDiscount: e.target.value })} min="0" />
              </div>
              <div className="space-y-2">
                <Label>Usage Limit</Label>
                <Input type="number" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} min="1" />
              </div>
              <div className="space-y-2">
                <Label>Per User Limit</Label>
                <Input type="number" value={form.perUserLimit} onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })} min="1" />
              </div>
              <div className="space-y-2">
                <Label>Expires At</Label>
                <Input type="datetime-local" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} required />
              </div>
              <div className="flex items-end">
                <Button type="submit" className="bg-pink-500 hover:bg-pink-600 text-white" disabled={createMutation.isPending}>
                  {createMutation.isPending ? "Creating..." : "Create"}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="mb-4">
        <Input placeholder="Search coupons..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="sm:w-64" />
      </div>

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="px-4 py-3 text-left font-medium">Code</th>
                  <th className="px-4 py-3 text-left font-medium">Type</th>
                  <th className="px-4 py-3 text-left font-medium">Discount</th>
                  <th className="px-4 py-3 text-left font-medium">Min Purchase</th>
                  <th className="px-4 py-3 text-left font-medium">Usage</th>
                  <th className="px-4 py-3 text-left font-medium">Expires</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.map((coupon: CouponData) => (
                  <tr key={coupon.id} className="border-b">
                    <td className="px-4 py-3 font-medium">{coupon.code}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex rounded-full px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700">
                        {coupon.type}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {coupon.type === "PERCENTAGE" ? `${coupon.discount}%` : formatPrice(coupon.discount)}
                      {coupon.maxDiscount && ` (max ${formatPrice(coupon.maxDiscount)})`}
                    </td>
                    <td className="px-4 py-3">{formatPrice(coupon.minPurchase)}</td>
                    <td className="px-4 py-3">
                      {coupon.usedCount}/{coupon.usageLimit || "∞"}
                    </td>
                    <td className="px-4 py-3">{new Date(coupon.expiresAt).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${coupon.active ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                        {coupon.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => toggleMutation.mutate({ id: coupon.id, active: !coupon.active })}>
                          {coupon.active ? "Disable" : "Enable"}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => { if (confirm("Delete this coupon?")) deleteMutation.mutate(coupon.id); }}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {coupons.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No coupons found.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
