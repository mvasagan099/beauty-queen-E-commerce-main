"use client";

import { useProductReviews } from "@/hooks/use-account";
import { RatingSummary } from "./rating-summary";
import { ReviewCard } from "./review-card";

interface ProductReviewsProps {
  productId: number;
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const { data, isLoading } = useProductReviews(productId);

  if (isLoading) {
    return (
      <div className="py-8 text-center text-gray-500">Loading reviews...</div>
    );
  }

  const reviews = data?.reviews || [];
  const avgRating = data?.avgRating || 0;
  const totalReviews = data?.totalReviews || 0;

  return (
    <div>
      {totalReviews > 0 && (
        <div className="mb-6">
          <RatingSummary avgRating={avgRating} totalReviews={totalReviews} />
        </div>
      )}

      {reviews.length === 0 ? (
        <p className="text-gray-500 text-sm">
          No reviews yet. Be the first to review this product!
        </p>
      ) : (
        <div>
          {reviews.map((review) => (
            <ReviewCard key={review.id} review={review} />
          ))}
        </div>
      )}
    </div>
  );
}
