"use client";

import { Star, BadgeCheck } from "lucide-react";
import { Review } from "@/types";

interface ReviewCardProps {
  review: Review;
}

export function ReviewCard({ review }: ReviewCardProps) {
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
      <p className="text-xs text-gray-400 mt-2">
        {new Date(review.createdAt).toLocaleDateString("en-IN")}
      </p>
    </div>
  );
}
