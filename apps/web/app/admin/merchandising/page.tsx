"use client";

import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Megaphone, ShoppingBag } from "lucide-react";

interface FlashSaleBanner {
  active: boolean;
  headline: string;
  subtext: string;
  couponCode: string;
  ctaLabel: string;
  ctaHref: string;
  endsAt: string | null;
}

export default function AdminMerchandisingPage() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<FlashSaleBanner>({
    active: false,
    headline: "",
    subtext: "",
    couponCode: "",
    ctaLabel: "Shop Now",
    ctaHref: "/saree",
    endsAt: "",
  });

  const { data, isLoading } = useQuery<{ success: boolean; banner: FlashSaleBanner }>({
    queryKey: ["admin-banner"],
    queryFn: () => api.get("/growth/banner"),
  });

  const { data: abandonedStats, refetch: refetchAbandoned } = useQuery<{
    success: boolean;
    eligibleCarts: number;
    totalAbandonedValue: number;
    minIdleMinutes: number;
  }>({
    queryKey: ["admin-abandoned-carts"],
    queryFn: () => api.get("/growth/abandoned-carts/stats"),
    retry: false,
  });

  useEffect(() => {
    if (data?.banner) {
      setForm({
        ...data.banner,
        endsAt: data.banner.endsAt ? data.banner.endsAt.slice(0, 16) : "",
      });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: () =>
      api.put("/growth/banner", {
        ...form,
        endsAt: form.endsAt ? new Date(form.endsAt).toISOString() : null,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-banner"] });
      queryClient.invalidateQueries({ queryKey: ["merchandising-banner"] });
      toast.success("Storefront flash sale banner saved");
    },
    onError: (err: Error) => toast.error(err.message || "Could not save banner"),
  });

  const sweepMutation = useMutation({
    mutationFn: () =>
      api.post<{
        success: boolean;
        scannedCarts: number;
        remindedCount: number;
        whatsappDispatched: number;
      }>("/growth/abandoned-carts/run", { minIdleMinutes: 120 }),
    onSuccess: (res) => {
      toast.success(
        `Sent ${res.remindedCount} recovery reminder(s) (${res.whatsappDispatched} via WhatsApp)`
      );
      refetchAbandoned();
    },
    onError: (err: Error) => toast.error(err.message || "Recovery sweep failed"),
  });

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-3xl font-bold text-foreground">Merchandising &amp; Flash Sales</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Control the live announcement &amp; countdown flash-sale ribbon displayed on the Beauty Queen homepage.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Megaphone className="h-5 w-5 text-primary" />
            Homepage Flash Sale Banner
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Loading merchandising config...</p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveMutation.mutate();
              }}
              className="space-y-4"
            >
              <label className="flex items-center gap-2.5 text-sm font-medium text-foreground cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.active}
                  onChange={(e) => setForm((f) => ({ ...f, active: e.target.checked }))}
                  className="h-4 w-4 accent-primary"
                />
                <span>Display banner live on storefront</span>
              </label>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Headline
                </label>
                <input
                  type="text"
                  value={form.headline}
                  onChange={(e) => setForm((f) => ({ ...f, headline: e.target.value }))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-muted-foreground mb-1">
                  Supporting Copy
                </label>
                <input
                  type="text"
                  value={form.subtext}
                  onChange={(e) => setForm((f) => ({ ...f, subtext: e.target.value }))}
                  className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Coupon Code
                  </label>
                  <input
                    type="text"
                    value={form.couponCode}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, couponCode: e.target.value.toUpperCase() }))
                    }
                    className="h-10 w-full rounded-md border border-input bg-background px-3 font-mono text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    Countdown Ends At (optional)
                  </label>
                  <input
                    type="datetime-local"
                    value={form.endsAt || ""}
                    onChange={(e) => setForm((f) => ({ ...f, endsAt: e.target.value }))}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    CTA Label
                  </label>
                  <input
                    type="text"
                    value={form.ctaLabel}
                    onChange={(e) => setForm((f) => ({ ...f, ctaLabel: e.target.value }))}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-muted-foreground mb-1">
                    CTA Route
                  </label>
                  <input
                    type="text"
                    value={form.ctaHref}
                    onChange={(e) => setForm((f) => ({ ...f, ctaHref: e.target.value }))}
                    className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <Button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {saveMutation.isPending ? "Saving..." : "Save Banner"}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShoppingBag className="h-4 w-4 text-primary" />
            Abandoned Cart Recovery (2h+ Idle)
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-sm text-foreground">
              <span className="font-semibold">{abandonedStats?.eligibleCarts ?? 0}</span> idle
              bag(s) totaling{" "}
              <span className="font-semibold text-primary">
                {formatPrice(abandonedStats?.totalAbandonedValue ?? 0)}
              </span>
            </p>
            <p className="text-xs text-muted-foreground">
              Sends Brevo email, in-app alert, and WhatsApp reminder (automatically deduped per 24h).
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={sweepMutation.isPending}
            onClick={() => sweepMutation.mutate()}
          >
            {sweepMutation.isPending ? "Sending..." : "Send Recovery Reminders"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
