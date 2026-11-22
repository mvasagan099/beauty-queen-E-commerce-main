"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Wallet, Download, FileSpreadsheet } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

interface SellerLedgerSummary {
  sellerId: number;
  sellerName: string;
  sellerEmail: string;
  orderCount: number;
  grossSales: number;
  platformFee: number;
  netPayable: number;
  settledAmount: number;
  pendingBalance: number;
}

interface Gstr1Report {
  month: string;
  gstin: string;
  invoiceCount: number;
  totals: {
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalTax: number;
    totalValue: number;
  };
  hsnSummary: {
    hsn: string;
    category: string;
    gstRate: number;
    quantity: number;
    taxableValue: number;
    cgst: number;
    sgst: number;
    igst: number;
    totalValue: number;
  }[];
}

export default function AdminPayoutsPage() {
  const queryClient = useQueryClient();
  const currentMonth = new Date().toISOString().slice(0, 7);
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [sellerId, setSellerId] = useState("");
  const [amount, setAmount] = useState("");
  const [utrReference, setUtrReference] = useState("");
  const [note, setNote] = useState("");

  const { data: ledgerData, isLoading } = useQuery<{
    success: boolean;
    commissionRate: number;
    totals: {
      grossSales: number;
      platformFee: number;
      netPayable: number;
      settledAmount: number;
      pendingBalance: number;
    };
    sellers: SellerLedgerSummary[];
  }>({
    queryKey: ["admin-payouts"],
    queryFn: () => api.get("/finance/admin/payouts"),
  });

  const { data: gstrData } = useQuery<{ success: boolean; report: Gstr1Report }>({
    queryKey: ["admin-gstr1", selectedMonth],
    queryFn: () => api.get(`/finance/admin/gstr1?month=${selectedMonth}`),
  });

  const settleMutation = useMutation({
    mutationFn: () =>
      api.post("/finance/admin/payouts", {
        sellerId: Number(sellerId),
        amount: Number(amount),
        utrReference,
        note: note || undefined,
      }),
    onSuccess: () => {
      toast.success("Seller payout recorded with UTR reference");
      setAmount("");
      setUtrReference("");
      setNote("");
      queryClient.invalidateQueries({ queryKey: ["admin-payouts"] });
    },
    onError: (err: Error) => toast.error(err.message || "Failed to record payout"),
  });

  const report = gstrData?.report;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground flex items-center gap-2">
          <Wallet className="h-7 w-7 text-primary" />
          Seller Payouts &amp; GST GSTR-1 Filing
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Settle multi-seller balances with bank UTR tracking and export monthly Indian GST GSTR-1 HSN statements.
        </p>
      </div>

      {/* Platform Finance Totals */}
      {ledgerData?.totals && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase">Gross GMV</p>
              <p className="font-display text-2xl font-semibold mt-1">
                {formatPrice(ledgerData.totals.grossSales)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase">
                Platform Fee ({Math.round(ledgerData.commissionRate * 100)}%)
              </p>
              <p className="font-display text-2xl font-semibold text-primary mt-1">
                {formatPrice(ledgerData.totals.platformFee)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase">Settled</p>
              <p className="font-display text-2xl font-semibold text-green-700 mt-1">
                {formatPrice(ledgerData.totals.settledAmount)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground uppercase">Pending Payable</p>
              <p className="font-display text-2xl font-semibold text-amber-700 mt-1">
                {formatPrice(ledgerData.totals.pendingBalance)}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Record Seller Payout Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Record Bank Settlement (UTR)</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              settleMutation.mutate();
            }}
            className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end"
          >
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Seller
              </label>
              <select
                value={sellerId}
                onChange={(e) => setSellerId(e.target.value)}
                required
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="">Select seller...</option>
                {(ledgerData?.sellers || []).map((s) => (
                  <option key={s.sellerId} value={s.sellerId}>
                    {s.sellerName} (Due: ₹{s.pendingBalance})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Amount (INR)
              </label>
              <input
                type="number"
                min={1}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="5000"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Bank UTR Reference
              </label>
              <input
                type="text"
                required
                value={utrReference}
                onChange={(e) => setUtrReference(e.target.value.toUpperCase())}
                placeholder="HDFCN2611220001"
                className="h-10 w-full rounded-md border border-input bg-background px-3 font-mono text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-muted-foreground mb-1">
                Note (optional)
              </label>
              <input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Weekly NEFT batch"
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
              />
            </div>
            <Button
              type="submit"
              disabled={settleMutation.isPending}
              className="h-10 bg-primary hover:bg-primary/90 text-primary-foreground"
            >
              {settleMutation.isPending ? "Recording..." : "Record Payout"}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Seller Ledger Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Seller Balances</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-24 rounded-lg bg-muted animate-pulse" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-4">Seller</th>
                    <th className="py-2 pr-4 text-right">Orders</th>
                    <th className="py-2 pr-4 text-right">Gross Sales</th>
                    <th className="py-2 pr-4 text-right">Fee</th>
                    <th className="py-2 pr-4 text-right">Settled</th>
                    <th className="py-2 text-right">Pending</th>
                  </tr>
                </thead>
                <tbody>
                  {(ledgerData?.sellers || []).map((s) => (
                    <tr key={s.sellerId} className="border-b last:border-b-0">
                      <td className="py-3 pr-4">
                        <p className="font-medium text-foreground">{s.sellerName}</p>
                        <p className="text-xs text-muted-foreground">{s.sellerEmail}</p>
                      </td>
                      <td className="py-3 pr-4 text-right">{s.orderCount}</td>
                      <td className="py-3 pr-4 text-right">{formatPrice(s.grossSales)}</td>
                      <td className="py-3 pr-4 text-right text-muted-foreground">
                        {formatPrice(s.platformFee)}
                      </td>
                      <td className="py-3 pr-4 text-right text-green-700">
                        {formatPrice(s.settledAmount)}
                      </td>
                      <td className="py-3 text-right font-semibold text-primary">
                        {formatPrice(s.pendingBalance)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Indian GST GSTR-1 Monthly Export */}
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-primary" />
              GST GSTR-1 HSN Monthly Export
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-0.5">
              GSTIN: <span className="font-mono">{report?.gstin || "33AAACB0000A1Z5"}</span> ·{" "}
              {report?.invoiceCount || 0} taxable invoice(s)
            </p>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm"
            />
            <a
              href={`${API_URL}/finance/admin/gstr1?month=${selectedMonth}&format=csv`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <Button variant="outline" size="sm" className="gap-1.5">
                <Download className="h-4 w-4" />
                Download CSV
              </Button>
            </a>
          </div>
        </CardHeader>
        <CardContent>
          {!report?.hsnSummary?.length ? (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No taxable orders recorded for {selectedMonth}.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-3">HSN</th>
                    <th className="py-2 pr-3">Category</th>
                    <th className="py-2 pr-3 text-right">Rate</th>
                    <th className="py-2 pr-3 text-right">Qty</th>
                    <th className="py-2 pr-3 text-right">Taxable</th>
                    <th className="py-2 pr-3 text-right">CGST</th>
                    <th className="py-2 pr-3 text-right">SGST</th>
                    <th className="py-2 pr-3 text-right">IGST</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {report.hsnSummary.map((r) => (
                    <tr key={`${r.hsn}-${r.gstRate}`} className="border-b last:border-b-0">
                      <td className="py-2.5 pr-3 font-mono">{r.hsn}</td>
                      <td className="py-2.5 pr-3 capitalize">{r.category}</td>
                      <td className="py-2.5 pr-3 text-right">{r.gstRate}%</td>
                      <td className="py-2.5 pr-3 text-right">{r.quantity}</td>
                      <td className="py-2.5 pr-3 text-right">₹{r.taxableValue.toFixed(2)}</td>
                      <td className="py-2.5 pr-3 text-right">₹{r.cgst.toFixed(2)}</td>
                      <td className="py-2.5 pr-3 text-right">₹{r.sgst.toFixed(2)}</td>
                      <td className="py-2.5 pr-3 text-right">₹{r.igst.toFixed(2)}</td>
                      <td className="py-2.5 text-right font-semibold">
                        ₹{r.totalValue.toFixed(2)}
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
