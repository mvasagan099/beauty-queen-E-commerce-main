"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Star, BadgeCheck, Camera, X } from "lucide-react";
import { useCreateReview, useCanReview } from "@/hooks/use-account";
import { reviewsApi } from "@/lib/api";
import { getProductImageUrl } from "@/lib/utils";
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
  const [photos, setPhotos] = useState<string[]>([]);
  const [isUploading, setIsUploading] = useState(false);
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

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remainingSlots = Math.max(0, 3 - photos.length);
    const toUpload = files.slice(0, remainingSlots);
    if (toUpload.length === 0) {
      toast.error("You can attach up to 3 photos per review");
      return;
    }

    setIsUploading(true);
    try {
      const uploadedUrls: string[] = [];
      for (const file of toUpload) {
        const res = await reviewsApi.uploadPhoto(file);
        if (res?.url) uploadedUrls.push(res.url);
      }
      setPhotos((prev) => [...prev, ...uploadedUrls].slice(0, 3));
      toast.success(`${uploadedUrls.length} photo${uploadedUrls.length > 1 ? "s" : ""} attached`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to upload photo");
    } finally {
      setIsUploading(false);
      e.target.value = "";
    }
  };

  const onSubmit = (data: ReviewFormData) => {
    createMutation.mutate(
      { productId, ...data, photos: photos.length > 0 ? photos : undefined },
      {
        onSuccess: () => {
          toast.success("Review submitted");
          reset();
          setPhotos([]);
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
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
          placeholder="Share how the drape, fit, or shade looked on you"
        />
      </div>

      <div className="space-y-2">
        <Label className="block">Add Photos (Optional, up to 3)</Label>
        <div className="flex flex-wrap items-center gap-2.5">
          {photos.map((url, idx) => (
            <div key={url} className="relative h-16 w-16 rounded-lg overflow-hidden border border-border">
              <img
                src={getProductImageUrl(url)}
                alt={`Review attachment ${idx + 1}`}
                className="h-full w-full object-cover"
              />
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() => setPhotos((prev) => prev.filter((p) => p !== url))}
                className="absolute top-0.5 right-0.5 rounded-full bg-black/70 p-0.5 text-white hover:bg-black"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {photos.length < 3 && (
            <label className="flex h-16 w-16 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-border text-muted-foreground hover:border-primary hover:text-primary transition-colors">
              <Camera className="h-4 w-4" />
              <span className="text-[10px] mt-0.5">{isUploading ? "..." : "Upload"}</span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp"
                multiple
                disabled={isUploading}
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>
          )}
        </div>
      </div>

      <Button
        type="submit"
        className="bg-primary hover:bg-primary/90 text-primary-foreground"
        disabled={createMutation.isPending || isUploading}
      >
        {createMutation.isPending ? "Submitting..." : "Submit Review"}
      </Button>
    </form>
  );
}
