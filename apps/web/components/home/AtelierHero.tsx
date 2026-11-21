"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { ShoppingBag, Sparkles } from "lucide-react";
import { ATELIER_DEPARTMENTS, type AtelierDepartmentId } from "./atelier-data";
import { AtelierStage3D } from "./AtelierStage3D";
import { TiltCard3D } from "./TiltCard3D";
import { formatPrice } from "@/lib/utils";

export function AtelierHero() {
  const [activeId, setActiveId] = useState<AtelierDepartmentId>("saree");
  const active =
    ATELIER_DEPARTMENTS.find((d) => d.id === activeId) ?? ATELIER_DEPARTMENTS[0];

  const savingsPct = Math.round(((active.mrp - active.price) / active.mrp) * 100);

  return (
    <section
      aria-label="Beauty Queen flagship showcase"
      className="relative overflow-hidden bg-[#1A0B10] text-[#FBF7F2]"
    >
      {/* Ambient silk-loom radial lighting */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 atelier-grain opacity-70"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-24 right-[-10%] h-[480px] w-[480px] rounded-full blur-3xl opacity-30"
        style={{
          background:
            "radial-gradient(circle, rgba(212,163,83,0.45) 0%, rgba(168,28,68,0.28) 50%, transparent 75%)",
        }}
      />

      <div className="container-page relative z-10 py-12 md:py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left Editorial Column (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <p className="text-sm font-medium text-[#D4A353]">
              Your Beauty, Our Priority
            </p>

            <h1 className="font-display text-5xl sm:text-6xl lg:text-[4.25rem] font-semibold leading-[1.03] tracking-[-0.025em] text-[#FBF7F2] text-balance">
              Beauty Queen
            </h1>

            <p className="font-display text-2xl sm:text-3xl leading-snug text-[#F0DFCE] max-w-xl">
              {active.headline}
            </p>

            <p className="text-sm sm:text-base leading-relaxed text-[#D8C7BC] max-w-lg">
              {active.tagline}
            </p>

            {/* Primary Actions */}
            <div className="flex flex-wrap items-center gap-3 pt-1">
              <Link
                href={active.href}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-[#A81C44] px-6 py-3 text-sm font-semibold text-[#FBF7F2] shadow-lg shadow-[#A81C44]/30 hover:bg-[#8E1638] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A353] focus-visible:ring-offset-2 focus-visible:ring-offset-[#1A0B10]"
              >
                <ShoppingBag className="h-4 w-4" />
                Shop {active.name}
              </Link>
              <Link
                href="/cosmetics"
                className="inline-flex items-center justify-center gap-2 rounded-md border border-[#D4A353]/50 bg-[#FBF7F2]/5 px-6 py-3 text-sm font-semibold text-[#FBF7F2] hover:bg-[#D4A353]/15 hover:border-[#D4A353] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A353]"
              >
                <Sparkles className="h-4 w-4 text-[#D4A353]" />
                Explore Cosmetics
              </Link>
            </div>

            {/* Department 3D Scene Switcher */}
            <div className="pt-4 border-t border-[#FBF7F2]/10">
              <p className="text-xs text-[#C7B3A8] mb-3">
                Select a house collection to transform the 3D stage
              </p>
              <div
                className="flex flex-wrap gap-2"
                role="tablist"
                aria-label="3D collection showcase switcher"
              >
                {ATELIER_DEPARTMENTS.map((dept) => {
                  const isActive = dept.id === activeId;
                  return (
                    <button
                      key={dept.id}
                      type="button"
                      role="tab"
                      aria-selected={isActive}
                      onClick={() => setActiveId(dept.id)}
                      className={`px-3.5 py-2 rounded-md text-xs sm:text-sm font-medium transition-all ${
                        isActive
                          ? "bg-[#FBF7F2] text-[#1A0B10] shadow-md"
                          : "bg-[#FBF7F2]/8 text-[#E5D5CA] hover:bg-[#FBF7F2]/15 border border-[#FBF7F2]/10"
                      }`}
                    >
                      {dept.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right Interactive 3D Couture Stage + Floating Lookbook Portrait (7 cols) */}
          <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
            {/* Live Interactive 3D Sculpture Canvas */}
            <div className="sm:col-span-7 relative h-[340px] sm:h-[430px] rounded-xl border border-[#D4A353]/25 bg-gradient-to-b from-[#271018]/90 via-[#1C0B11] to-[#14070B] shadow-2xl overflow-hidden">
              <div className="absolute top-3 left-3 z-10 flex items-center gap-2 rounded-md bg-[#1A0B10]/75 backdrop-blur-sm px-2.5 py-1 border border-[#D4A353]/25">
                <span
                  className="h-2 w-2 rounded-full"
                  style={{ backgroundColor: active.secondaryHex }}
                />
                <span className="text-xs text-[#F2E3D4] font-medium">
                  {active.sculptureLabel}
                </span>
              </div>
              <AtelierStage3D department={activeId} />
            </div>

            {/* Tactile 3D Editorial Portrait Card */}
            <div className="sm:col-span-5">
              <TiltCard3D maxTilt={11} className="rounded-xl">
                <div className="relative overflow-hidden rounded-xl border border-[#D4A353]/30 bg-[#241017] shadow-2xl">
                  <div className="relative aspect-[3/4] w-full overflow-hidden">
                    <Image
                      src={active.image}
                      alt={active.featuredTitle}
                      fill
                      priority
                      sizes="(max-width: 640px) 100vw, 320px"
                      className="object-cover transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#1A0B10] via-[#1A0B10]/20 to-transparent" />
                    <span className="absolute top-3 right-3 rounded-md bg-[#1A0B10]/80 backdrop-blur-sm px-2.5 py-1 text-xs font-semibold text-[#D4A353] border border-[#D4A353]/30">
                      Save {savingsPct}%
                    </span>
                  </div>

                  <div className="p-4 space-y-2">
                    <h2 className="font-display text-xl font-semibold leading-tight text-[#FBF7F2]">
                      {active.featuredTitle}
                    </h2>
                    <p className="text-xs text-[#D1BFB5] leading-relaxed">
                      {active.fabricNote}
                    </p>
                    <div className="flex items-baseline justify-between pt-2 border-t border-[#FBF7F2]/10">
                      <div className="flex items-baseline gap-2 tabular-nums">
                        <span className="text-lg font-bold text-[#D4A353]">
                          {formatPrice(active.price)}
                        </span>
                        <span className="text-xs text-[#B69FA5] line-through">
                          {formatPrice(active.mrp)}
                        </span>
                      </div>
                      <Link
                        href={active.href}
                        className="text-xs font-semibold text-[#FBF7F2] underline decoration-[#D4A353] underline-offset-4 hover:text-[#D4A353] transition-colors"
                      >
                        View collection
                      </Link>
                    </div>
                  </div>
                </div>
              </TiltCard3D>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
