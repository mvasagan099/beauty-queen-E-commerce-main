"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Copy, Clock } from "lucide-react";

interface FlashSaleBannerData {
  active: boolean;
  headline: string;
  subtext: string;
  couponCode: string;
  ctaLabel: string;
  ctaHref: string;
  endsAt: string | null;
}

function formatRemaining(endsAt: string | null): string | null {
  if (!endsAt) return null;
  const diff = new Date(endsAt).getTime() - Date.now();
  if (!Number.isFinite(diff) || diff <= 0) return null;
  const hrs = Math.floor(diff / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  const secs = Math.floor((diff % 60_000) / 1000);
  return `${String(hrs).padStart(2, "0")}h ${String(mins).padStart(2, "0")}m ${String(secs).padStart(2, "0")}s`;
}

export function FlashSaleBanner() {
  const { data } = useQuery<{ success: boolean; banner: FlashSaleBannerData }>({
    queryKey: ["merchandising-banner"],
    queryFn: () => api.get("/growth/banner"),
    retry: false,
    staleTime: 60_000,
  });

  const banner = data?.banner;
  const [countdown, setCountdown] = useState<string | null>(null);

  useEffect(() => {
    if (!banner?.active || !banner.endsAt) {
      setCountdown(null);
      return;
    }
    const tick = () => setCountdown(formatRemaining(banner.endsAt));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [banner?.active, banner?.endsAt]);

  if (!banner?.active) return null;

  const copyCode = async () => {
    if (!banner.couponCode) return;
    try {
      await navigator.clipboard.writeText(banner.couponCode);
      toast.success(`Copied coupon code ${banner.couponCode}`);
    } catch {
      toast.info(`Use code ${banner.couponCode} at checkout`);
    }
  };

  return (
    <div className="bg-[#A81C44] text-[#FBF7F2] border-b border-[#D4A353]/30">
      <div className="container-page py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold">{banner.headline}</span>
          {banner.subtext && (
            <span className="text-[#F4E3D7] hidden md:inline">{banner.subtext}</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          {countdown && (
            <span className="inline-flex items-center gap-1 rounded bg-[#1A0B10]/55 px-2 py-1 text-xs font-mono text-[#D4A353] tabular-nums">
              <Clock className="h-3.5 w-3.5" />
              {countdown}
            </span>
          )}
          {banner.couponCode && (
            <button
              type="button"
              onClick={copyCode}
              className="inline-flex items-center gap-1.5 rounded border border-[#D4A353]/60 bg-[#1A0B10]/40 px-2.5 py-1 text-xs font-semibold text-[#FBF7F2] hover:bg-[#1A0B10]/70 transition-colors"
            >
              <span>{banner.couponCode}</span>
              <Copy className="h-3 w-3 text-[#D4A353]" />
            </button>
          )}
          <Link
            href={banner.ctaHref || "/saree"}
            className="text-xs font-semibold underline decoration-[#D4A353] underline-offset-4 hover:text-[#D4A353]"
          >
            {banner.ctaLabel || "Shop Now"}
          </Link>
        </div>
      </div>
    </div>
  );
}
