"use client";

import { useState } from "react";
import { Star, BadgeCheck, X } from "lucide-react";
import { Review } from "@/types";
import { getProductImageUrl } from "@/lib/utils";

interface ReviewCardProps {
  review: Review;
}

export function ReviewCard({ review }: ReviewCardProps) {
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const photos = Array.isArray(review.photos) ? review.photos : [];

  return (
    <div className="border-b py-4 last:border-b-0">
      <div className="flex items-center gap-2 mb-1">
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-3.5 w-3.5 ${
                star <= review.rating
                  ? "fill-yellow-400 text-yellow-400"
                  : "text-gray-300"
              }`}
            />
          ))}
        </div>
        <span className="text-sm font-medium text-gray-900">
          {review.user?.name || "Anonymous"}
        </span>
        {review.isVerifiedPurchase && (
          <span
            title="This review was written by a customer who purchased this product."
            className="inline-flex items-center gap-0.5 rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700"
          >
            <BadgeCheck className="h-3 w-3 text-green-600" />
            Verified Purchase
          </span>
        )}
      </div>
      {review.title && (
        <p className="text-sm font-medium text-gray-800">{review.title}</p>
      )}
      {review.comment && (
        <p className="text-sm text-gray-600 mt-1">{review.comment}</p>
      )}
      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2.5">
          {photos.map((photo, idx) => (
            <button
              key={`${photo}-${idx}`}
              type="button"
              onClick={() => setLightboxUrl(getProductImageUrl(photo))}
              className="h-16 w-16 rounded-lg overflow-hidden border border-border hover:ring-2 hover:ring-primary/50 transition-all"
              aria-label={`View customer photo ${idx + 1}`}
            >
              <img
                src={getProductImageUrl(photo)}
                alt={`Customer review photo ${idx + 1}`}
                className="h-full w-full object-cover"
              />
            </button>
          ))}
        </div>
      )}
      <p className="text-xs text-gray-400 mt-2">
        {new Date(review.createdAt).toLocaleDateString("en-IN")}
      </p>

      {lightboxUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Customer review photo"
          onClick={() => setLightboxUrl(null)}
        >
          <button
            type="button"
            onClick={() => setLightboxUrl(null)}
            aria-label="Close photo"
            className="absolute top-4 right-4 rounded-full bg-white/15 p-2 text-white hover:bg-white/25"
          >
            <X className="h-5 w-5" />
          </button>
          <img
            src={lightboxUrl}
            alt="Customer review photo enlarged"
            className="max-h-[85vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}
