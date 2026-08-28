"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { sellerApi, productsApi } from "@/lib/api";
import { getProductImageUrl } from "@/lib/utils";
import { Product } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";

const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  price: z.coerce.number().positive("Price must be positive"),
  mrp: z.coerce.number().positive("MRP must be positive").optional(),
  description: z.string().optional(),
  ptype: z.string().min(1, "Category is required"),
  sizeS: z.coerce.number().min(0).optional(),
  sizeM: z.coerce.number().min(0).optional(),
  sizeL: z.coerce.number().min(0).optional(),
  sizeXl: z.coerce.number().min(0).optional(),
  sizeXxl: z.coerce.number().min(0).optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const id = Number(resolvedParams.id);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [imageError, setImageError] = useState("");
  const router = useRouter();

  const { data: productData, isLoading: productLoading } = useQuery<{
    product: Product;
  }>({
    queryKey: ["seller-product", id],
    queryFn: () => sellerApi.product(id),
  });

  const product = productData?.product;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
  });

  useEffect(() => {
    if (product) {
      reset({
        name: product.name || "",
        price: product.price || 0,
        mrp: product.mrp || undefined,
        description: product.description || "",
        ptype: product.ptype || "",
        sizeS: product.sizeS ?? undefined,
        sizeM: product.sizeM ?? undefined,
        sizeL: product.sizeL ?? undefined,
        sizeXl: product.sizeXl ?? undefined,
        sizeXxl: product.sizeXxl ?? undefined,
      });
    }
  }, [product, reset]);

  const handleImageChange = (files: FileList | null) => {
    setImageError("");
    if (!files || files.length === 0) return;

    const valid = Array.from(files).filter(
      (file) =>
        file.type.startsWith("image/") && file.size <= 5 * 1024 * 1024
    );

    if (valid.length !== files.length) {
      setImageError("Each image must be a valid image file under 5MB.");
    }

    const kept = [...imageFiles, ...valid].slice(0, 6);
    setImageFiles(kept);
    setImagePreviews(kept.map((f) => URL.createObjectURL(f)));
  };

  const removeImage = (index: number) => {
    const next = imageFiles.filter((_, i) => i !== index);
    setImageFiles(next);
    setImagePreviews(next.map((f) => URL.createObjectURL(f)));
  };

  const onSubmit = async (data: ProductFormData) => {
    setLoading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("name", data.name);
      formData.append("price", String(data.price));
      if (data.mrp) formData.append("mrp", String(data.mrp));
      if (data.description) formData.append("description", data.description);
      formData.append("ptype", data.ptype);
      if (data.sizeS != null) formData.append("sizeS", String(data.sizeS));
      if (data.sizeM != null) formData.append("sizeM", String(data.sizeM));
      if (data.sizeL != null) formData.append("sizeL", String(data.sizeL));
      if (data.sizeXl != null) formData.append("sizeXl", String(data.sizeXl));
      if (data.sizeXxl != null) formData.append("sizeXxl", String(data.sizeXxl));
      imageFiles.forEach((file) => formData.append("images", file));

      if (imageFiles.length > 0) {
        await productsApi.update(id, formData);
      } else {
        await productsApi.update(id, {
          name: data.name,
          price: data.price,
          mrp: data.mrp,
          description: data.description,
          ptype: data.ptype,
          sizeS: data.sizeS,
          sizeM: data.sizeM,
          sizeL: data.sizeL,
          sizeXl: data.sizeXl,
          sizeXxl: data.sizeXxl,
        });
      }

      router.push("/seller/products");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to update product");
    } finally {
      setLoading(false);
    }
  };

  if (productLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Edit Product</h1>

      <Card>
        <CardContent className="p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Product Name</Label>
              <Input id="name" placeholder="Enter product name" {...register("name")} />
              {errors.name && (
                <p className="text-sm text-red-500">{errors.name.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (₹)</Label>
                <Input id="price" type="number" step="0.01" {...register("price")} />
                {errors.price && (
                  <p className="text-sm text-red-500">{errors.price.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="mrp">MRP (₹)</Label>
                <Input id="mrp" type="number" step="0.01" {...register("mrp")} />
                {errors.mrp && (
                  <p className="text-sm text-red-500">{errors.mrp.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <textarea
                id="description"
                className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Product description"
                {...register("description")}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="ptype">Category</Label>
              <select
                id="ptype"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                {...register("ptype")}
              >
                <option value="">Select category</option>
                <option value="saree">Saree</option>
                <option value="kurthi">Kurthi</option>
                <option value="top">Top</option>
                <option value="leggin">Leggin</option>
                <option value="cosmetics">Cosmetics</option>
              </select>
              {errors.ptype && (
                <p className="text-sm text-red-500">{errors.ptype.message}</p>
              )}
            </div>

            <div>
              <Label className="mb-2 block">Stock by Size</Label>
              <div className="grid grid-cols-5 gap-2">
                {(["sizeS", "sizeM", "sizeL", "sizeXl", "sizeXxl"] as const).map(
                  (s) => (
                    <div key={s} className="space-y-1">
                      <Label className="text-xs text-gray-500">
                        {s.replace("size", "")}
                      </Label>
                      <Input
                        type="number"
                        min="0"
                        placeholder="0"
                        {...register(s)}
                      />
                    </div>
                  )
                )}
              </div>
            </div>

            {/* Current Images */}
            {product && (
              <div>
                <Label className="mb-2 block">Current Images</Label>
                <div className="flex gap-2 flex-wrap">
                  {[product.image, product.image1, product.image2, product.image3, product.image4]
                    .filter(Boolean)
                    .map((img, i) => (
                      <div
                        key={i}
                        className="h-16 w-16 rounded overflow-hidden bg-gray-100"
                      >
                        <img
                          src={getProductImageUrl(img)}
                          alt=""
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>Update Images</Label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => handleImageChange(e.target.files)}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:bg-pink-50 file:text-pink-600 hover:file:bg-pink-100"
              />
              {imageError && <p className="text-sm text-red-500">{imageError}</p>}
              {imageFiles.length > 0 && (
                <p className="text-xs text-gray-500">
                  {imageFiles.length} file(s) selected (max 6)
                </p>
              )}
              {imagePreviews.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-2">
                  {imagePreviews.map((src, i) => (
                    <div key={i} className="relative group">
                      <img
                        src={src}
                        alt={`New image ${i + 1}`}
                        className="h-20 w-full rounded-md border object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(i)}
                        aria-label={`Remove image ${i + 1}`}
                        className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs text-white shadow hover:bg-red-600"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <Button
              type="submit"
              className="w-full bg-pink-500 hover:bg-pink-600 text-white"
              disabled={loading}
            >
              {loading ? "Updating..." : "Update Product"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
