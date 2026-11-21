"use client";

import { useEffect, useState } from "react";
import { Ruler, X } from "lucide-react";

interface SizeGuideModalProps {
  category?: string | null;
}

const APPAREL_ROWS = [
  { size: "S", bustIn: "34", waistIn: "28", hipIn: "36", bustCm: "86", waistCm: "71", hipCm: "91" },
  { size: "M", bustIn: "36", waistIn: "30", hipIn: "38", bustCm: "91", waistCm: "76", hipCm: "97" },
  { size: "L", bustIn: "38", waistIn: "32", hipIn: "40", bustCm: "97", waistCm: "81", hipCm: "102" },
  { size: "XL", bustIn: "40", waistIn: "34", hipIn: "42", bustCm: "102", waistCm: "86", hipCm: "107" },
  { size: "XXL", bustIn: "42", waistIn: "36", hipIn: "44", bustCm: "107", waistCm: "91", hipCm: "112" },
];

export function SizeGuideModal({ category }: SizeGuideModalProps) {
  const [open, setOpen] = useState(false);
  const [unit, setUnit] = useState<"in" | "cm">("in");

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  const normalizedCat = (category || "").toLowerCase();
  const isSaree = normalizedCat.includes("saree");
  const isCosmetics = normalizedCat.includes("cosmetic");

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-primary underline underline-offset-4 hover:text-primary/80 transition-colors"
      >
        <Ruler className="h-3.5 w-3.5" />
        <span>Size &amp; Fit Guide</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#1A0B10]/65 backdrop-blur-sm p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Beauty Queen Size and Fit Guide"
          onClick={() => setOpen(false)}
        >
          <div
            className="w-full max-w-lg rounded-xl border border-border bg-[#FBF7F2] text-foreground shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div>
                <h2 className="font-display text-2xl font-semibold text-foreground">
                  Size &amp; Fit Guide
                </h2>
                <p className="text-xs text-muted-foreground">
                  Beauty Queen Indian women&apos;s standard measurements
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-md p-1.5 text-muted-foreground hover:bg-muted"
                aria-label="Close size guide"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {isSaree ? (
                <div className="space-y-3 text-sm text-foreground">
                  <p className="font-medium">Standard Drape Dimensions (Free Size)</p>
                  <ul className="space-y-2 text-xs text-muted-foreground list-disc pl-5">
                    <li>Saree length: 5.5 metres (standard Indian pleat drape)</li>
                    <li>Unstitched matching blouse piece: 0.8 metres</li>
                    <li>Border width: 3–5 inches woven zari pallu finish</li>
                    <li>Dry clean recommended for pure Kanjeevaram &amp; zari silk</li>
                  </ul>
                </div>
              ) : isCosmetics ? (
                <div className="space-y-3 text-sm text-foreground">
                  <p className="font-medium">Cosmetics Packaging &amp; Care</p>
                  <ul className="space-y-2 text-xs text-muted-foreground list-disc pl-5">
                    <li>Standard full-size retail packaging (Free Size / One Size)</li>
                    <li>Dermatologically tested for Indian skin tones</li>
                    <li>Store away from direct sunlight below 30°C</li>
                  </ul>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-muted-foreground">
                      Between sizes? Choose one size up for a relaxed festive drape.
                    </p>
                    <div className="inline-flex rounded-md border border-input p-0.5 bg-background">
                      <button
                        type="button"
                        onClick={() => setUnit("in")}
                        className={`px-2.5 py-1 rounded text-xs font-medium ${
                          unit === "in" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                        }`}
                      >
                        Inches
                      </button>
                      <button
                        type="button"
                        onClick={() => setUnit("cm")}
                        className={`px-2.5 py-1 rounded text-xs font-medium ${
                          unit === "cm" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                        }`}
                      >
                        cm
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-left text-xs tabular-nums">
                      <thead className="bg-muted/70 text-foreground">
                        <tr>
                          <th className="px-3.5 py-2.5 font-semibold">Size</th>
                          <th className="px-3.5 py-2.5 font-semibold">Bust ({unit})</th>
                          <th className="px-3.5 py-2.5 font-semibold">Waist ({unit})</th>
                          <th className="px-3.5 py-2.5 font-semibold">Hip ({unit})</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border bg-card">
                        {APPAREL_ROWS.map((row) => (
                          <tr key={row.size}>
                            <td className="px-3.5 py-2 font-semibold text-primary">{row.size}</td>
                            <td className="px-3.5 py-2">{unit === "in" ? row.bustIn : row.bustCm}</td>
                            <td className="px-3.5 py-2">{unit === "in" ? row.waistIn : row.waistCm}</td>
                            <td className="px-3.5 py-2">{unit === "in" ? row.hipIn : row.hipCm}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
