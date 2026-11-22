"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet, CheckCircle2, Clock, Percent } from "lucide-react";

interface PayoutRecord {
  id: string;
  sellerId: number;
  amount: number;
  utrReference: string;
  note: string | null;
  settledAt: string;
}

interface SellerLedger {
  sellerId: number;
  sellerName: string;
  orderCount: number;
  grossSales: number;
  commissionRate: number;
  platformFee: number;
  netPayable: number;
  settledAmount: number;
  pendingBalance: number;
  payouts: PayoutRecord[];
}

export default function SellerPayoutsPage() {
  const { data, isLoading } = useQuery<{ success: boolean; ledger: SellerLedger }>({
    queryKey: ["seller-payouts"],
    queryFn: () => api.get("/finance/seller/payouts"),
    retry: false,
  });

  const ledger = data?.ledger;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold text-foreground flex items-center gap-2">
          <Wallet className="h-7 w-7 text-primary" />
          Payouts &amp; Commission Ledger
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Track your gross sales, platform fee, net earnings, and bank UTR settlements.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wider">Gross Sales</p>
                <p className="font-display text-3xl font-semibold text-foreground mt-1">
                  {formatPrice(ledger?.grossSales || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {ledger?.orderCount || 0} active order(s)
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Percent className="h-3.5 w-3.5" />
                  Platform Fee ({Math.round((ledger?.commissionRate || 0.1) * 100)}%)
                </p>
                <p className="font-display text-3xl font-semibold text-foreground mt-1">
                  {formatPrice(ledger?.platformFee || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Deducted before settlement</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5 text-green-600" />
                  Total Settled
                </p>
                <p className="font-display text-3xl font-semibold text-green-700 mt-1">
                  {formatPrice(ledger?.settledAmount || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  {ledger?.payouts?.length || 0} bank transfer(s)
                </p>
              </CardContent>
            </Card>
            <Card className="border-primary/30 bg-primary/5">
              <CardContent className="p-5">
                <p className="text-xs text-muted-foreground uppercase tracking-wider flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5 text-primary" />
                  Pending Balance
                </p>
                <p className="font-display text-3xl font-semibold text-primary mt-1">
                  {formatPrice(ledger?.pendingBalance || 0)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Next payout cycle</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Settlement History</CardTitle>
            </CardHeader>
            <CardContent>
              {!ledger?.payouts?.length ? (
                <p className="text-sm text-muted-foreground py-6 text-center">
                  No settlements recorded yet. Completed bank transfers and UTR references will appear here.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-left text-xs uppercase text-muted-foreground">
                        <th className="py-2 pr-4">Date</th>
                        <th className="py-2 pr-4">UTR Reference</th>
                        <th className="py-2 pr-4">Note</th>
                        <th className="py-2 text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.payouts.map((p) => (
                        <tr key={p.id} className="border-b last:border-b-0">
                          <td className="py-3 pr-4">
                            {new Date(p.settledAt).toLocaleDateString("en-IN")}
                          </td>
                          <td className="py-3 pr-4 font-mono text-xs">{p.utrReference}</td>
                          <td className="py-3 pr-4 text-muted-foreground">{p.note || "—"}</td>
                          <td className="py-3 text-right font-semibold text-green-700">
                            {formatPrice(p.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
