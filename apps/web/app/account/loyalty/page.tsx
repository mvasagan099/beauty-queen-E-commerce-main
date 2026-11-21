"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LoadingPage } from "@/components/ui/spinner";
import { formatPrice } from "@/lib/utils";
import { Crown, Copy, Gift, Share2 } from "lucide-react";
import { toast } from "sonner";

interface LoyaltySummary {
  tier: "Rose" | "Gold" | "Royal Zari";
  points: number;
  lifetimeSpend: number;
  nextTier: string | null;
  spendToNextTier: number;
  referralCode: string;
  referralsClaimed: number;
  appliedReferralCode: string | null;
}

export default function AccountLoyaltyPage() {
  const queryClient = useQueryClient();
  const [friendCode, setFriendCode] = useState("");

  const { data, isLoading } = useQuery<{ success: boolean; loyalty: LoyaltySummary }>({
    queryKey: ["account-loyalty"],
    queryFn: () => api.get("/growth/loyalty"),
  });

  const referralMutation = useMutation({
    mutationFn: (code: string) => api.post("/growth/loyalty/referral", { code }),
    onSuccess: (res) => {
      setFriendCode("");
      queryClient.invalidateQueries({ queryKey: ["account-loyalty"] });
      toast.success(res.message || "Referral bonus credited!");
    },
    onError: (err: Error) => toast.error(err.message || "Could not apply referral code"),
  });

  if (isLoading) {
    return <LoadingPage text="Loading your Queen's Circle status..." />;
  }

  const loyalty = data?.loyalty;

  const copyReferral = async () => {
    if (!loyalty?.referralCode) return;
    try {
      await navigator.clipboard.writeText(loyalty.referralCode);
      toast.success(`Copied referral code ${loyalty.referralCode}`);
    } catch {
      toast.info(`Share code: ${loyalty.referralCode}`);
    }
  };

  const shareWhatsApp = () => {
    if (!loyalty?.referralCode) return;
    const msg = `Shop Beauty Queen sarees, kurthis & cosmetics using my Queen's Circle code ${loyalty.referralCode} to get 200 bonus points!`;
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="page-container max-w-3xl space-y-6">
      <div>
        <h1 className="page-title mb-1">Queen&apos;s Circle Rewards</h1>
        <p className="text-sm text-muted-foreground">
          Earn 1 point for every ₹10 spent and invite friends for 200 bonus points each.
        </p>
      </div>

      {/* Membership Card */}
      <Card className="overflow-hidden border-[#D4A353]/40 bg-[#1A0B10] text-[#FBF7F2]">
        <CardContent className="p-6 sm:p-8 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Crown className="h-5 w-5 text-[#D4A353]" />
              <Badge className="bg-[#D4A353] text-[#1A0B10] hover:bg-[#D4A353]">
                {loyalty?.tier || "Rose"} Tier
              </Badge>
            </div>
            <p className="font-display text-4xl font-semibold tabular-nums">
              {(loyalty?.points ?? 0).toLocaleString("en-IN")} pts
            </p>
            <p className="text-xs text-[#D8C7BC]">
              Lifetime spend: {formatPrice(loyalty?.lifetimeSpend ?? 0)}
              {loyalty?.nextTier
                ? ` · Spend ${formatPrice(loyalty.spendToNextTier)} more to unlock ${loyalty.nextTier}`
                : " · Highest Atelier tier unlocked"}
            </p>
          </div>

          <div className="rounded-lg border border-[#D4A353]/30 bg-[#241017] p-4 space-y-2.5 min-w-[220px]">
            <p className="text-xs text-[#C7B3A8]">Your Invite Code</p>
            <p className="font-mono text-lg font-bold tracking-wider text-[#D4A353]">
              {loyalty?.referralCode || "BQ-MEMBER"}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={copyReferral}
                className="flex-1 border-[#D4A353]/40 bg-transparent text-[#FBF7F2] hover:bg-[#D4A353]/15 gap-1.5 text-xs"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={shareWhatsApp}
                className="flex-1 bg-[#A81C44] hover:bg-[#8C1537] text-[#FBF7F2] gap-1.5 text-xs"
              >
                <Share2 className="h-3.5 w-3.5" />
                WhatsApp
              </Button>
            </div>
            <p className="text-[11px] text-[#B69FA5]">
              {loyalty?.referralsClaimed ?? 0} friend{(loyalty?.referralsClaimed ?? 0) === 1 ? "" : "s"} joined
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Redeem Friend's Referral Code */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Gift className="h-4 w-4 text-primary" />
            Have a friend&apos;s referral code?
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loyalty?.appliedReferralCode ? (
            <p className="text-sm text-emerald-700 font-medium">
              Welcome referral code <span className="font-mono">{loyalty.appliedReferralCode}</span> redeemed (+200 points).
            </p>
          ) : (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (friendCode.trim()) referralMutation.mutate(friendCode.trim());
              }}
              className="flex flex-col sm:flex-row gap-2.5"
            >
              <input
                type="text"
                value={friendCode}
                onChange={(e) => setFriendCode(e.target.value.toUpperCase())}
                placeholder="Enter code (e.g., BQ9A1B2)"
                aria-label="Friend referral code"
                className="h-10 flex-1 rounded-md border border-input bg-background px-3 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
              <Button
                type="submit"
                disabled={referralMutation.isPending || !friendCode.trim()}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {referralMutation.isPending ? "Applying..." : "Claim 200 Points"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
