"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Expand, X, ZoomIn, ZoomOut } from "lucide-react";
import { getProductImageUrl } from "@/lib/utils";

interface ProductGalleryProps {
  images: (string | null | undefined)[];
  alt: string;
}

export function ProductGallery({ images, alt }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});
  const [hoverZoom, setHoverZoom] = useState(false);
  const [origin, setOrigin] = useState({ x: 50, y: 50 });
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxZoomed, setLightboxZoomed] = useState(false);

  const validImages = images.filter(Boolean) as string[];
  const displayImages = validImages.length > 0 ? validImages : [""];
  const safeIndex = Math.min(activeIndex, displayImages.length - 1);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setLightboxOpen(false);
        setLightboxZoomed(false);
      } else if (e.key === "ArrowRight" && displayImages.length > 1) {
        setActiveIndex((prev) => (prev + 1) % displayImages.length);
      } else if (e.key === "ArrowLeft" && displayImages.length > 1) {
        setActiveIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [lightboxOpen, displayImages.length]);

  const getImgSrc = (img: string, idx: number) => {
    if (!img || imgErrors[idx]) {
      return "https://placehold.co/600x800/fce7f3/a81c44?text=Beauty+Queen";
    }
    return getProductImageUrl(img);
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setOrigin({ x, y });
  };

  return (
    <div>
      {/* Main Interactive Zoom Frame */}
      <div
        className="group relative aspect-[3/4] rounded-xl overflow-hidden bg-muted mb-4 cursor-zoom-in border border-border/60"
        onMouseEnter={() => setHoverZoom(true)}
        onMouseLeave={() => setHoverZoom(false)}
        onMouseMove={handleMouseMove}
        onClick={() => setLightboxOpen(true)}
        role="button"
        tabIndex={0}
        aria-label={`Open full screen gallery for ${alt}`}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setLightboxOpen(true);
          }
        }}
      >
        <Image
          src={getImgSrc(displayImages[safeIndex], safeIndex)}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          priority
          unoptimized
          onError={() => setImgErrors((prev) => ({ ...prev, [safeIndex]: true }))}
          style={{
            transformOrigin: `${origin.x}% ${origin.y}%`,
            transform: hoverZoom ? "scale(1.65)" : "scale(1)",
          }}
          className="object-cover transition-transform duration-200 ease-out"
        />

        <span className="pointer-events-none absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-md bg-[#1A0B10]/75 backdrop-blur-sm px-2.5 py-1.5 text-xs font-medium text-[#FBF7F2] opacity-90 group-hover:opacity-100">
          <Expand className="h-3.5 w-3.5 text-[#D4A353]" />
          <span>Inspect &amp; Zoom</span>
        </span>
      </div>

      {/* Thumbnail Strip */}
      {displayImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {displayImages.map((img, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setActiveIndex(i)}
              className={`relative h-16 w-16 sm:h-20 sm:w-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                safeIndex === i
                  ? "border-primary ring-2 ring-primary/20"
                  : "border-border hover:border-primary/40"
              }`}
              aria-label={`View image ${i + 1} of ${displayImages.length}`}
            >
              <Image
                src={getImgSrc(img, i)}
                alt={`${alt} thumbnail ${i + 1}`}
                fill
                sizes="80px"
                className="object-cover"
                onError={() => setImgErrors((prev) => ({ ...prev, [i]: true }))}
                unoptimized
              />
            </button>
          ))}
        </div>
      )}

      {/* Fullscreen Lightbox */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#1A0B10]/95 p-4"
          role="dialog"
          aria-modal="true"
          aria-label={`Fullscreen gallery for ${alt}`}
        >
          <div className="absolute top-4 right-4 z-20 flex items-center gap-2">
            <button
              type="button"
              onClick={() => setLightboxZoomed((z) => !z)}
              className="rounded-md bg-[#FBF7F2]/10 p-2 text-[#FBF7F2] hover:bg-[#FBF7F2]/20 transition-colors"
              aria-label={lightboxZoomed ? "Zoom out" : "Zoom in"}
            >
              {lightboxZoomed ? <ZoomOut className="h-5 w-5" /> : <ZoomIn className="h-5 w-5" />}
            </button>
            <button
              type="button"
              onClick={() => {
                setLightboxOpen(false);
                setLightboxZoomed(false);
              }}
              className="rounded-md bg-[#FBF7F2]/10 p-2 text-[#FBF7F2] hover:bg-[#FBF7F2]/20 transition-colors"
              aria-label="Close fullscreen gallery"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {displayImages.length > 1 && (
            <>
              <button
                type="button"
                onClick={() =>
                  setActiveIndex((prev) => (prev - 1 + displayImages.length) % displayImages.length)
                }
                className="absolute left-4 top-1/2 -translate-y-1/2 z-20 rounded-full bg-[#FBF7F2]/10 p-2.5 text-[#FBF7F2] hover:bg-[#FBF7F2]/20"
                aria-label="Previous image"
              >
                <ChevronLeft className="h-6 w-6" />
              </button>
              <button
                type="button"
                onClick={() => setActiveIndex((prev) => (prev + 1) % displayImages.length)}
                className="absolute right-4 top-1/2 -translate-y-1/2 z-20 rounded-full bg-[#FBF7F2]/10 p-2.5 text-[#FBF7F2] hover:bg-[#FBF7F2]/20"
                aria-label="Next image"
              >
                <ChevronRight className="h-6 w-6" />
              </button>
            </>
          )}

          <div
            className="relative w-full max-w-2xl aspect-[3/4] max-h-[82vh] overflow-hidden rounded-lg cursor-pointer"
            onClick={() => setLightboxZoomed((z) => !z)}
          >
            <Image
              src={getImgSrc(displayImages[safeIndex], safeIndex)}
              alt={alt}
              fill
              sizes="(max-width: 768px) 95vw, 680px"
              unoptimized
              className={`object-contain transition-transform duration-300 ${
                lightboxZoomed ? "scale-150" : "scale-100"
              }`}
            />
          </div>

          <p className="mt-3 text-xs text-[#D8C7BC]">
            Image {safeIndex + 1} of {displayImages.length} — Click image to {lightboxZoomed ? "reset zoom" : "zoom in"}
          </p>
        </div>
      )}
    </div>
  );
}
