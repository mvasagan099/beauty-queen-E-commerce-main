"use client";

import { Star } from "lucide-react";

interface RatingSummaryProps {
  avgRating: number;
  totalReviews: number;
}

export function RatingSummary({ avgRating, totalReviews }: RatingSummaryProps) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center gap-1">
        <Star className="h-5 w-5 fill-yellow-400 text-yellow-400" />
        <span className="text-lg font-bold text-gray-900">{avgRating}</span>
      </div>
      <span className="text-sm text-gray-500">
        {totalReviews} review{totalReviews !== 1 ? "s" : ""}
      </span>
    </div>
  );
}
