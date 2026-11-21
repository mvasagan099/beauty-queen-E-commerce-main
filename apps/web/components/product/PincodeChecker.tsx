"use client";

import { useState } from "react";
import { MapPin, CheckCircle2, AlertCircle, Truck } from "lucide-react";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface PincodeCheckerProps {
  subtotal: number;
}

interface EstimateResult {
  serviceable: boolean;
  charge: number;
  freeShipping: boolean;
  estimatedDays: string;
  codAvailable: boolean;
}

export function PincodeChecker({ subtotal }: PincodeCheckerProps) {
  const [pincode, setPincode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<EstimateResult | null>(null);

  const handleCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = pincode.trim();
    if (!/^[1-9]\d{5}$/.test(cleaned)) {
      setResult(null);
      setError("Enter a valid 6-digit Indian pincode (for example, 600001).");
      return;
    }

    setError(null);
    setLoading(true);
    try {
      const res = await api.get<EstimateResult & { success: boolean }>(
        `/shipping/calculate?subtotal=${encodeURIComponent(String(subtotal))}&pincode=${encodeURIComponent(cleaned)}`,
      );
      setResult({
        serviceable: res.serviceable ?? true,
        charge: res.charge ?? 0,
        freeShipping: res.freeShipping ?? (res.charge ?? 0) === 0,
        estimatedDays: res.estimatedDays || "3–5 business days",
        codAvailable: res.codAvailable ?? true,
      });
    } catch {
      // Graceful local fallback if shipping API is unreachable
      const prefix = Number(cleaned.substring(0, 2));
      const estimatedDays =
        prefix >= 60 && prefix <= 64
          ? "2–3 business days"
          : prefix >= 50 && prefix <= 69
          ? "3–4 business days"
          : "4–6 business days";
      const freeShipping = subtotal >= 499;
      setResult({
        serviceable: true,
        charge: freeShipping ? 0 : 60,
        freeShipping,
        estimatedDays,
        codAvailable: true,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-card/80 p-4 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
        <MapPin className="h-4 w-4 text-primary" />
        <span>Check Delivery &amp; COD Availability</span>
      </div>

      <form onSubmit={handleCheck} className="flex gap-2">
        <input
          type="text"
          inputMode="numeric"
          maxLength={6}
          value={pincode}
          onChange={(e) => setPincode(e.target.value.replace(/\D/g, ""))}
          placeholder="Enter 6-digit pincode"
          aria-label="Delivery pincode"
          className="h-9 flex-1 rounded-md border border-input bg-background px-3 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <Button type="submit" size="sm" variant="outline" disabled={loading}>
          {loading ? "Checking..." : "Check"}
        </Button>
      </form>

      {error && (
        <p className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="h-3.5 w-3.5 flex-shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {result && (
        <div className="space-y-1.5 text-xs pt-1">
          {result.serviceable ? (
            <>
              <p className="flex items-center gap-1.5 font-medium text-emerald-700">
                <CheckCircle2 className="h-3.5 w-3.5 flex-shrink-0" />
                <span>
                  Deliverable in {result.estimatedDays} (
                  {result.freeShipping ? "Free Shipping" : `Shipping ${formatPrice(result.charge)}`})
                </span>
              </p>
              <p className="flex items-center gap-1.5 text-muted-foreground">
                <Truck className="h-3.5 w-3.5 flex-shrink-0" />
                <span>
                  {result.codAvailable
                    ? "Cash on Delivery & Razorpay UPI available"
                    : "Prepaid Razorpay UPI / Cards available"}
                </span>
              </p>
            </>
          ) : (
            <p className="text-destructive">Currently not serviceable at this pincode.</p>
          )}
        </div>
      )}
    </div>
  );
}
