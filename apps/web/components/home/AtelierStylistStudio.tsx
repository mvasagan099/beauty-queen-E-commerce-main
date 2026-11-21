"use client";

import { useState } from "react";
import Link from "next/link";
import { Sparkles, Palette, Send } from "lucide-react";
import { api } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const SKIN_TONES = [
  { id: "fair", label: "Fair Neutral", hex: "#EBC8AE" },
  { id: "wheatish", label: "Medium Wheatish", hex: "#D2A07A" },
  { id: "golden", label: "Warm Golden", hex: "#B97D52" },
  { id: "deep", label: "Deep Rich", hex: "#7A4831" },
];

const LIP_SHADES = [
  {
    id: "kumkum",
    name: "Madras Kumkum",
    finish: "Velvet Matte",
    hex: "#A81C44",
    pairing: "Pairs effortlessly with Kanjeevaram crimson & temple zari.",
    price: 749,
  },
  {
    id: "sindoor",
    name: "Royal Sindoor",
    finish: "Satin Crème",
    hex: "#9B1D2C",
    pairing: "Statement bridal red engineered for warm Indian undertones.",
    price: 799,
  },
  {
    id: "rosewood",
    name: "Rosewood Silk",
    finish: "Soft Blur Matte",
    hex: "#9E525E",
    pairing: "Everyday office and kurthi favorite with subtle rose depth.",
    price: 699,
  },
  {
    id: "chai",
    name: "Spiced Chai Nude",
    finish: "Weightless Matte",
    hex: "#8F5444",
    pairing: "Universal warm terracotta-brown nude for minimal daily wear.",
    price: 699,
  },
  {
    id: "plum",
    name: "Mulberry Wine",
    finish: "Velvet Lacquer",
    hex: "#611D37",
    pairing: "Evening reception plum that brightens golden and deep skin.",
    price: 849,
  },
  {
    id: "zari",
    name: "24K Saffron Gloss",
    finish: "Botanical Shimmer",
    hex: "#C5894B",
    pairing: "Layer over matte lipsticks for festive golden radiance.",
    price: 899,
  },
];

const QUICK_PROMPTS = [
  "Wedding silk saree under ₹5000",
  "Breathable festive kurthi under ₹2000",
  "Daily matte lipstick & glow serum",
];

interface StylistResult {
  stylistNote: string;
  intent: { category: string; maxPrice: number | null };
  recommendations: {
    id: number;
    name: string | null;
    price: number | null;
    mrp: number | null;
    ptype: string | null;
  }[];
}

export function AtelierStylistStudio() {
  const [tone, setTone] = useState(SKIN_TONES[1]);
  const [shade, setShade] = useState(LIP_SHADES[0]);
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [stylistResult, setStylistResult] = useState<StylistResult | null>(null);

  const runStylist = async (query: string) => {
    const cleaned = query.trim();
    if (!cleaned) return;
    setPrompt(cleaned);
    setLoading(true);
    try {
      const res = await api.post<StylistResult>("/growth/stylist", { prompt: cleaned });
      setStylistResult(res);
    } catch {
      // Graceful offline curated advice
      const lower = cleaned.toLowerCase();
      const cat = lower.includes("saree")
        ? "saree"
        : lower.includes("kurthi")
        ? "kurthi"
        : lower.includes("lip") || lower.includes("cosmetic") || lower.includes("serum")
        ? "cosmetics"
        : "saree";
      setStylistResult({
        intent: { category: cat, maxPrice: null },
        stylistNote:
          cat === "saree"
            ? "Choose a Kanjeevaram crimson or antique-gold zari drape paired with Madras Kumkum matte lip."
            : cat === "kurthi"
            ? "Pair an ivory mirror-work silk-cotton kurthi with jewel-tone modal leggings."
            : "Prep with botanical saffron glow serum before layering Velvet Matte Madras Kumkum.",
        recommendations: [],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      aria-label="Shade studio and Beauty Queen stylist"
      className="py-14 md:py-20 bg-[#1A0B10] text-[#FBF7F2]"
    >
      <div className="container-page">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Interactive Cosmetics Shade Matcher */}
          <div className="lg:col-span-6 rounded-xl border border-[#D4A353]/25 bg-[#241017] p-6 sm:p-7 flex flex-col justify-between space-y-6">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[#D4A353] text-xs font-medium">
                <Palette className="h-4 w-4" />
                <span>Cosmetics Shade Studio</span>
              </div>
              <h2 className="font-display text-3xl font-semibold text-[#FBF7F2]">
                Preview lip pigments on your undertone
              </h2>
              <p className="text-xs sm:text-sm text-[#D8C7BC]">
                Select your Indian skin undertone and tap any velvet shade to inspect contrast and outfit pairing.
              </p>
            </div>

            {/* Interactive Swatch Stage */}
            <div
              className="relative rounded-xl p-6 border border-[#FBF7F2]/10 transition-colors duration-300 flex items-center justify-between gap-5"
              style={{ backgroundColor: tone.hex }}
            >
              <div className="space-y-1.5">
                <span className="inline-block rounded bg-[#1A0B10]/75 px-2.5 py-1 text-[11px] font-medium text-[#FBF7F2]">
                  {tone.label}
                </span>
                <div
                  className="h-14 w-36 sm:w-44 rounded-full shadow-lg border border-white/25 transition-colors duration-300 flex items-center justify-center"
                  style={{ backgroundColor: shade.hex }}
                >
                  <span className="text-xs font-semibold text-white drop-shadow-sm">
                    {shade.name}
                  </span>
                </div>
              </div>
              <div className="rounded-lg bg-[#1A0B10]/85 backdrop-blur-sm p-3.5 text-right max-w-[180px] border border-[#D4A353]/30">
                <p className="text-xs font-semibold text-[#D4A353]">{shade.finish}</p>
                <p className="text-sm font-bold text-[#FBF7F2] mt-0.5 tabular-nums">
                  {formatPrice(shade.price)}
                </p>
                <Link
                  href="/cosmetics"
                  className="mt-2 inline-block text-[11px] font-semibold text-[#FBF7F2] underline decoration-[#D4A353] underline-offset-4 hover:text-[#D4A353]"
                >
                  Shop Cosmetics
                </Link>
              </div>
            </div>

            {/* Tone & Shade Selectors */}
            <div className="space-y-4">
              <div>
                <p className="text-xs text-[#C7B3A8] mb-2">Undertone</p>
                <div className="flex flex-wrap gap-2">
                  {SKIN_TONES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTone(t)}
                      className={`inline-flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs border transition-colors ${
                        tone.id === t.id
                          ? "border-[#D4A353] bg-[#FBF7F2]/12 text-[#FBF7F2]"
                          : "border-[#FBF7F2]/15 text-[#D8C7BC] hover:border-[#D4A353]/50"
                      }`}
                    >
                      <span
                        className="h-3.5 w-3.5 rounded-full border border-white/30"
                        style={{ backgroundColor: t.hex }}
                      />
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs text-[#C7B3A8] mb-2">Velvet Shade — {shade.pairing}</p>
                <div className="flex flex-wrap gap-2.5">
                  {LIP_SHADES.map((s) => (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => setShade(s)}
                      aria-label={`Select shade ${s.name}`}
                      className={`h-9 w-9 rounded-full border-2 transition-transform ${
                        shade.id === s.id
                          ? "border-[#D4A353] scale-110 ring-2 ring-[#D4A353]/40"
                          : "border-white/25 hover:scale-105"
                      }`}
                      style={{ backgroundColor: s.hex }}
                      title={s.name}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Beauty Queen AI Stylist Assistant */}
          <div className="lg:col-span-6 rounded-xl border border-[#D4A353]/25 bg-[#241017] p-6 sm:p-7 flex flex-col justify-between space-y-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-[#D4A353] text-xs font-medium">
                <Sparkles className="h-4 w-4" />
                <span>Personal House Stylist</span>
              </div>
              <h2 className="font-display text-3xl font-semibold text-[#FBF7F2]">
                Ask for an occasion &amp; budget edit
              </h2>
              <p className="text-xs sm:text-sm text-[#D8C7BC]">
                Describe an event, fabric, or ₹ budget and we will filter the live catalog with pairing notes.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {QUICK_PROMPTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => runStylist(q)}
                  className="rounded-md border border-[#D4A353]/30 bg-[#1A0B10]/70 px-3 py-1.5 text-xs text-[#F0DFCE] hover:border-[#D4A353] transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                runStylist(prompt);
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g., Festive Kanjeevaram saree under ₹5000"
                aria-label="Ask the Beauty Queen stylist"
                className="h-11 flex-1 rounded-md border border-[#D4A353]/30 bg-[#1A0B10] px-3.5 text-sm text-[#FBF7F2] placeholder:text-[#A99298] focus:outline-none focus:ring-2 focus:ring-[#D4A353]"
              />
              <Button
                type="submit"
                disabled={loading || !prompt.trim()}
                className="h-11 px-5 bg-[#A81C44] hover:bg-[#8C1537] text-[#FBF7F2] gap-2"
              >
                <Send className="h-4 w-4" />
                {loading ? "Styling..." : "Style Me"}
              </Button>
            </form>

            {stylistResult ? (
              <div className="rounded-lg border border-[#D4A353]/25 bg-[#1A0B10]/85 p-4 space-y-3">
                <p className="text-xs sm:text-sm text-[#F0DFCE] leading-relaxed">
                  {stylistResult.stylistNote}
                </p>
                {stylistResult.recommendations.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {stylistResult.recommendations.slice(0, 4).map((rec) => (
                      <Link
                        key={rec.id}
                        href={`/product/${rec.id}`}
                        className="rounded-md border border-[#FBF7F2]/10 bg-[#241017] px-3 py-2 hover:border-[#D4A353]/60 transition-colors flex items-center justify-between gap-2"
                      >
                        <span className="text-xs font-medium text-[#FBF7F2] truncate">
                          {rec.name}
                        </span>
                        {rec.price != null && (
                          <span className="text-xs font-bold text-[#D4A353] tabular-nums flex-shrink-0">
                            {formatPrice(rec.price)}
                          </span>
                        )}
                      </Link>
                    ))}
                  </div>
                ) : (
                  <Link
                    href={
                      stylistResult.intent.category !== "all"
                        ? `/${stylistResult.intent.category}${stylistResult.intent.maxPrice ? `?maxPrice=${stylistResult.intent.maxPrice}` : ""}`
                        : "/saree"
                    }
                    className="inline-block text-xs font-semibold text-[#D4A353] underline underline-offset-4"
                  >
                    Open curated collection
                  </Link>
                )}
              </div>
            ) : (
              <div className="rounded-lg border border-[#FBF7F2]/10 bg-[#1A0B10]/60 p-4 text-xs text-[#C7B3A8]">
                Try asking for a saree, embroidered kurthi, satin top, modal leggings, or velvet cosmetics with your preferred price ceiling.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
