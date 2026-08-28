"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { sellersApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const profileSchema = z.object({
  sellername: z.string().min(1, "Name is required"),
  mobile: z.string().min(10, "Mobile must be at least 10 digits"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(4, "Password must be at least 4 characters").optional().or(z.literal("")),
});

type ProfileFormData = z.infer<typeof profileSchema>;

export default function SellerProfilePage() {
  const queryClient = useQueryClient();
  const [success, setSuccess] = useState("");

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ProfileFormData>({
    resolver: zodResolver(profileSchema),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["seller-profile"],
    queryFn: () => sellersApi.profile(),
  });

  useEffect(() => {
    if (data?.seller) {
      reset({
        sellername: data.seller.sellername || "",
        mobile: data.seller.mobile || "",
        email: data.seller.email || "",
        password: "",
      });
    }
  }, [data, reset]);

  const updateMutation = useMutation({
    mutationFn: (form: ProfileFormData) => {
      const payload: Record<string, string> = {
        sellername: form.sellername,
        mobile: form.mobile,
        email: form.email,
      };
      if (form.password) payload.password = form.password;
      return sellersApi.updateProfile(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["seller-profile"] });
      setSuccess("Profile updated successfully.");
    },
    onError: (err: Error) => {
      setSuccess(err.message || "Failed to update profile.");
    },
  });

  const onSubmit = (form: ProfileFormData) => {
    setSuccess("");
    updateMutation.mutate(form);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Seller Profile</h1>

      <Card>
        <CardHeader>
          <CardTitle>Account Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sellername">Shop Name</Label>
              <Input
                id="sellername"
                placeholder="Enter shop name"
                {...register("sellername")}
              />
              {errors.sellername && (
                <p className="text-sm text-red-500">{errors.sellername.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="Enter email"
                {...register("email")}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="mobile">Mobile Number</Label>
              <Input
                id="mobile"
                type="tel"
                placeholder="Enter mobile number"
                {...register("mobile")}
              />
              {errors.mobile && (
                <p className="text-sm text-red-500">{errors.mobile.message}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">New Password (optional)</Label>
              <Input
                id="password"
                type="password"
                placeholder="Leave blank to keep current password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-sm text-red-500">{errors.password.message}</p>
              )}
            </div>
            {success && <p className="text-sm text-green-600">{success}</p>}
            <Button
              type="submit"
              className="w-full bg-pink-500 hover:bg-pink-600 text-white"
              disabled={updateMutation.isPending}
            >
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}