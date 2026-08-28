"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Star, BadgeCheck } from "lucide-react";
import { useCreateReview, useCanReview } from "@/hooks/use-account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const reviewSchema = z.object({
  rating: z.number().min(1, "Rating is required").max(5),
  title: z.string().max(255).optional(),
  comment: z.string().optional(),
});

type ReviewFormData = z.infer<typeof reviewSchema>;

interface ReviewFormProps {
  productId: number;
  onSuccess?: () => void;
}

export function ReviewForm({ productId, onSuccess }: ReviewFormProps) {
  const [hoveredStar, setHoveredStar] = useState(0);
  const createMutation = useCreateReview();
  const { data: canReviewData } = useCanReview(productId);

  const isVerifiedPurchase = canReviewData?.verifiedPurchase === true;

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    reset,
  } = useForm<ReviewFormData>({
    resolver: zodResolver(reviewSchema),
    defaultValues: { rating: 0, title: "", comment: "" },
  });

  const currentRating = watch("rating");

  const onSubmit = (data: ReviewFormData) => {
    createMutation.mutate(
      { productId, ...data },
      {
        onSuccess: () => {
          toast.success("Review submitted");
          reset();
          onSuccess?.();
        },
        onError: (err: Error) => {
          toast.error(err.message || "Failed to submit review");
        },
      }
    );
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {isVerifiedPurchase && (
        <div className="flex items-center gap-1.5 text-sm font-medium text-green-700">
          <BadgeCheck className="h-4 w-4 text-green-600" />
          Verified Purchase
        </div>
      )}

      <div>
        <Label className="mb-2 block">Your Rating</Label>
        <div className="flex items-center gap-1">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              onClick={() => setValue("rating", star, { shouldValidate: true })}
            >
              <Star
                className={`h-6 w-6 transition-colors ${
                  star <= (hoveredStar || currentRating)
                    ? "fill-yellow-400 text-yellow-400"
                    : "text-gray-300"
                }`}
              />
            </button>
          ))}
        </div>
        {errors.rating && (
          <p className="text-sm text-red-500 mt-1">{errors.rating.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="review-title">Title (Optional)</Label>
        <Input
          id="review-title"
          {...register("title")}
          placeholder="Summarize your review"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="review-comment">Comment (Optional)</Label>
        <textarea
          id="review-comment"
          {...register("comment")}
          rows={3}
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent"
          placeholder="Share your experience with this product"
        />
      </div>

      <Button
        type="submit"
        className="bg-pink-500 hover:bg-pink-600 text-white"
        disabled={createMutation.isPending}
      >
        {createMutation.isPending ? "Submitting..." : "Submit Review"}
      </Button>
    </form>
  );
}
