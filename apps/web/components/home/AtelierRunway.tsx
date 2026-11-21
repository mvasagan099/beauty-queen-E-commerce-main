"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Rotate3d, ShieldCheck, Truck, RefreshCw, Award } from "lucide-react";
import { ATELIER_DEPARTMENTS, HOUSE_PROMISES } from "./atelier-data";
import { TiltCard3D } from "./TiltCard3D";
import { formatPrice } from "@/lib/utils";

const promiseIcons = [Award, ShieldCheck, Truck, RefreshCw];

export function AtelierRunway() {
  const [flippedCard, setFlippedCard] = useState<string | null>(null);

  return (
    <>
      {/* Five Departments — Tactile 3D Studio Runway */}
      <section className="py-14 md:py-20 border-b border-border/70">
        <div className="container-page">
          <div className="max-w-2xl mb-10">
            <h2 className="section-title">Shop by Collection</h2>
            <p className="section-subtitle mt-2">
              Hover any house collection to experience its fabric sheen, or flip a card to read textile and sizing notes.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-5">
            {ATELIER_DEPARTMENTS.map((dept) => {
              const isFlipped = flippedCard === dept.id;
              return (
                <div key={dept.id} className="perspective-1200">
                  <TiltCard3D maxTilt={9} className="rounded-xl h-full">
                    <div
                      className="relative h-[370px] w-full preserve-3d transition-transform duration-700 ease-out motion-safe-3d"
                      style={{
                        transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
                      }}
                    >
                      {/* Front Face */}
                      <div className="absolute inset-0 backface-hidden rounded-xl overflow-hidden border border-[#2D1B22]/10 bg-[#1A0B10] shadow-md flex flex-col">
                        <Link
                          href={dept.href}
                          className="relative flex-1 block overflow-hidden group"
                          aria-label={`Browse ${dept.name} collection`}
                        >
                          <Image
                            src={dept.image}
                            alt={`${dept.name} — ${dept.featuredTitle}`}
                            fill
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 20vw"
                            className="object-cover transition-transform duration-700 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-[#1A0B10] via-[#1A0B10]/25 to-transparent" />
                          <div className="absolute bottom-3 left-3.5 right-3.5">
                            <h3 className="font-display text-2xl font-semibold text-[#FBF7F2]">
                              {dept.name}
                            </h3>
                            <p className="text-xs text-[#DFCFC4] mt-0.5 line-clamp-1">
                              From {formatPrice(dept.price)}
                            </p>
                          </div>
                        </Link>
                        <div className="flex items-center justify-between px-3.5 py-2.5 bg-[#1F0D13] border-t border-[#D4A353]/20">
                          <Link
                            href={dept.href}
                            className="text-xs font-semibold text-[#FBF7F2] hover:text-[#D4A353] transition-colors"
                          >
                            Explore {dept.name}
                          </Link>
                          <button
                            type="button"
                            onClick={() => setFlippedCard(dept.id)}
                            aria-label={`Inspect ${dept.name} craft details`}
                            className="inline-flex items-center gap-1 text-xs text-[#D4A353] hover:text-[#FBF7F2] transition-colors"
                          >
                            <Rotate3d className="h-3.5 w-3.5" />
                            Details
                          </button>
                        </div>
                      </div>

                      {/* Back Face (3D Flip Fabric & Craft Card) */}
                      <div
                        className="absolute inset-0 backface-hidden rounded-xl overflow-hidden border border-[#D4A353]/35 bg-[#241017] text-[#FBF7F2] p-5 flex flex-col justify-between shadow-lg"
                        style={{ transform: "rotateY(180deg)" }}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h3 className="font-display text-2xl font-semibold text-[#D4A353]">
                              {dept.name}
                            </h3>
                            <button
                              type="button"
                              onClick={() => setFlippedCard(null)}
                              aria-label={`Flip ${dept.name} card back`}
                              className="text-xs text-[#D8C7BC] hover:text-[#FBF7F2] underline underline-offset-4"
                            >
                              Back
                            </button>
                          </div>
                          <p className="text-sm font-medium text-[#FBF7F2]">
                            {dept.featuredTitle}
                          </p>
                          <p className="text-xs leading-relaxed text-[#D8C7BC]">
                            {dept.fabricNote}
                          </p>
                          <div className="pt-2 border-t border-[#FBF7F2]/10">
                            <p className="text-xs text-[#C7B3A8] mb-1.5">Available fits</p>
                            <div className="flex flex-wrap gap-1.5">
                              {dept.sizes.map((size) => (
                                <span
                                  key={size}
                                  className="rounded border border-[#D4A353]/30 px-2 py-0.5 text-[11px] text-[#F2E3D4]"
                                >
                                  {size}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3 pt-3 border-t border-[#FBF7F2]/10">
                          <div className="flex items-baseline gap-2 tabular-nums">
                            <span className="text-lg font-bold text-[#D4A353]">
                              {formatPrice(dept.price)}
                            </span>
                            <span className="text-xs text-[#B69FA5] line-through">
                              {formatPrice(dept.mrp)}
                            </span>
                          </div>
                          <Link
                            href={dept.href}
                            className="block w-full text-center rounded-md bg-[#A81C44] py-2 text-xs font-semibold text-[#FBF7F2] hover:bg-[#8E1638] transition-colors"
                          >
                            Shop {dept.name}
                          </Link>
                        </div>
                      </div>
                    </div>
                  </TiltCard3D>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* House Promises Strip */}
      <section aria-label="Beauty Queen service promises" className="py-10 bg-[#F3ECE4]/70 border-b border-border/70">
        <div className="container-page">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {HOUSE_PROMISES.map((item, idx) => {
              const Icon = promiseIcons[idx] ?? Award;
              return (
                <div key={item.title} className="flex items-start gap-3.5">
                  <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-[#1A0B10] text-[#D4A353]">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-foreground">{item.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                      {item.detail}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}
