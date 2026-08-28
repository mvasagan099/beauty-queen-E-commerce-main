"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import {
  useAddresses,
  useCreateAddress,
  useUpdateAddress,
  useDeleteAddress,
  useSetDefaultAddress,
} from "@/hooks/use-account";
import { Address } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { MapPin, Plus, Pencil, Trash2, Star } from "lucide-react";

const addressSchema = z.object({
  name: z.string().min(1, "Name is required"),
  phone: z
    .string()
    .regex(/^\d{10}$/, "Phone must be a 10-digit number"),
  address: z.string().min(5, "Address is required"),
  pincode: z
    .string()
    .regex(/^[1-9]\d{5}$/, "Enter a valid 6-digit pincode"),
  district: z.string().min(1, "District is required"),
  landmark: z.string().optional(),
  isDefault: z.boolean().optional(),
});

type AddressFormData = z.infer<typeof addressSchema>;

export default function AccountAddressesPage() {
  const { data, isLoading } = useAddresses();
  const createMutation = useCreateAddress();
  const updateMutation = useUpdateAddress();
  const deleteMutation = useDeleteAddress();
  const setDefaultMutation = useSetDefaultAddress();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<AddressFormData>({
    resolver: zodResolver(addressSchema),
  });

  const addresses = data?.addresses || [];

  const onSubmit = (formData: AddressFormData) => {
    if (editingId) {
      updateMutation.mutate(
        { id: editingId, data: formData },
        {
          onSuccess: () => {
            toast.success("Address updated");
            reset();
            setEditingId(null);
            setShowForm(false);
          },
          onError: (err: Error) => toast.error(err.message),
        }
      );
    } else {
      createMutation.mutate(formData, {
        onSuccess: () => {
          toast.success("Address created");
          reset();
          setShowForm(false);
        },
        onError: (err: Error) => toast.error(err.message),
      });
    }
  };

  const handleEdit = (address: Address) => {
    setEditingId(address.id);
    setShowForm(true);
    setValue("name", address.name);
    setValue("phone", address.phone);
    setValue("address", address.address);
    setValue("pincode", address.pincode);
    setValue("district", address.district);
    setValue("landmark", address.landmark || "");
    setValue("isDefault", address.isDefault);
  };

  const handleDelete = (id: number) => {
    if (confirm("Delete this address?")) {
      deleteMutation.mutate(id, {
        onSuccess: () => toast.success("Address deleted"),
        onError: (err: Error) => toast.error(err.message),
      });
    }
  };

  const handleSetDefault = (id: number) => {
    setDefaultMutation.mutate(id, {
      onSuccess: () => toast.success("Default address updated"),
      onError: (err: Error) => toast.error(err.message),
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-pink-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900">My Addresses</h1>
        {!showForm && (
          <Button
            className="bg-pink-500 hover:bg-pink-600 text-white"
            onClick={() => {
              setEditingId(null);
              reset();
              setShowForm(true);
            }}
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Address
          </Button>
        )}
      </div>

      {showForm && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>{editingId ? "Edit Address" : "New Address"}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input id="name" {...register("name")} placeholder="Enter name" />
                  {errors.name && <p className="text-sm text-red-500">{errors.name.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" {...register("phone")} placeholder="Enter phone" />
                  {errors.phone && <p className="text-sm text-red-500">{errors.phone.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <Input id="address" {...register("address")} placeholder="Enter full address" />
                {errors.address && <p className="text-sm text-red-500">{errors.address.message}</p>}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="pincode">Pincode</Label>
                  <Input id="pincode" {...register("pincode")} placeholder="Enter pincode" />
                  {errors.pincode && <p className="text-sm text-red-500">{errors.pincode.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="district">District</Label>
                  <Input id="district" {...register("district")} placeholder="Enter district" />
                  {errors.district && <p className="text-sm text-red-500">{errors.district.message}</p>}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="landmark">Landmark (Optional)</Label>
                <Input id="landmark" {...register("landmark")} placeholder="Enter landmark" />
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  type="submit"
                  className="bg-pink-500 hover:bg-pink-600 text-white"
                  disabled={createMutation.isPending || updateMutation.isPending}
                >
                  {editingId ? "Update Address" : "Save Address"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    reset();
                    setEditingId(null);
                    setShowForm(false);
                  }}
                >
                  Cancel
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {addresses.length === 0 ? (
        <div className="flex flex-col items-center gap-4 min-h-[30vh] justify-center">
          <MapPin className="h-12 w-12 text-gray-300" />
          <p className="text-gray-500">No addresses saved yet.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {addresses.map((address) => (
            <Card key={address.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-gray-900">{address.name}</h3>
                      {address.isDefault && (
                        <span className="rounded bg-pink-100 px-2 py-0.5 text-xs font-medium text-pink-600">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{address.phone}</p>
                    <p className="text-sm text-gray-600">{address.address}</p>
                    <p className="text-sm text-gray-600">
                      {address.district} - {address.pincode}
                    </p>
                    {address.landmark && (
                      <p className="text-sm text-gray-500">Landmark: {address.landmark}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    {!address.isDefault && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleSetDefault(address.id)}
                        disabled={setDefaultMutation.isPending}
                      >
                        <Star className="h-4 w-4" />
                      </Button>
                    )}
                    <Button variant="ghost" size="sm" onClick={() => handleEdit(address)}>
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(address.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
