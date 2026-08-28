"use client";

import { useState } from "react";
import Image from "next/image";
import { getProductImageUrl } from "@/lib/utils";

interface ProductGalleryProps {
  images: (string | null)[];
  alt: string;
}

export function ProductGallery({ images, alt }: ProductGalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [imgErrors, setImgErrors] = useState<Record<number, boolean>>({});
  const validImages = images.filter(Boolean) as string[];

  const getImgSrc = (img: string, idx: number) => {
    if (imgErrors[idx]) return "https://placehold.co/600x800/fce7f3/ec4899?text=No+Image";
    return getProductImageUrl(img);
  };

  if (validImages.length === 0) {
    return (
      <div className="aspect-square rounded-lg overflow-hidden bg-gray-100">
        <div className="h-full w-full flex items-center justify-center text-gray-400">
          No image available
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="relative aspect-square rounded-lg overflow-hidden bg-gray-100 mb-4">
        <Image
          src={getImgSrc(validImages[activeIndex], activeIndex)}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover"
          onError={() => setImgErrors((prev) => ({ ...prev, [activeIndex]: true }))}
          unoptimized
        />
      </div>
      {validImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {validImages.map((img, i) => (
            <button
              key={i}
              onClick={() => setActiveIndex(i)}
              className={`relative h-20 w-20 flex-shrink-0 rounded-md overflow-hidden border-2 transition-colors ${
                activeIndex === i
                  ? "border-pink-500"
                  : "border-gray-200 hover:border-pink-300"
              }`}
              aria-label={`View image ${i + 1}`}
            >
              <Image
                src={getImgSrc(img, i)}
                alt={`${alt} - Image ${i + 1}`}
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
    </div>
  );
}
