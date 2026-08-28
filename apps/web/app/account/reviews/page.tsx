"use client";

import { useState } from "react";
import { useMyReviews, useDeleteReview } from "@/hooks/use-account";
import { Review } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatPrice, getProductImageUrl } from "@/lib/utils";
import { Star, Trash2 } from "lucide-react";
import { toast } from "sonner";

function StarRating({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-4 w-4 ${
            star <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          }`}
        />
      ))}
    </div>
  );
}

export default function AccountReviewsPage() {
  const { data, isLoading } = useMyReviews();
  const deleteMutation = useDeleteReview();

  const handleDelete = (id: number) => {
    if (confirm("Delete this review?")) {
      deleteMutation.mutate(id, {
        onSuccess: () => toast.success("Review deleted"),
        onError: (err: Error) => toast.error(err.message),
      });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
      </div>
    );
  }

  const reviews = data?.reviews || [];

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">My Reviews</h1>

      {reviews.length === 0 ? (
        <div className="flex flex-col items-center gap-4 min-h-[40vh] justify-center">
          <p className="text-gray-500">You haven&apos;t written any reviews yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {review.product?.image && (
                    <div className="h-16 w-16 flex-shrink-0 rounded overflow-hidden bg-gray-100">
                      <img
                        src={getProductImageUrl(review.product.image)}
                        alt={review.product.name || ""}
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-gray-900 truncate">
                      {review.product?.name || `Product #${review.productId}`}
                    </h3>
                    <StarRating rating={review.rating} />
                    {review.title && (
                      <p className="text-sm font-medium text-gray-700 mt-1">{review.title}</p>
                    )}
                    {review.comment && (
                      <p className="text-sm text-gray-600 mt-1">{review.comment}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">
                      {new Date(review.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDelete(review.id)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
