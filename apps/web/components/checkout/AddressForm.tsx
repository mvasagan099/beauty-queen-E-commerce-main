"use client";

import { UseFormRegister, FieldErrors } from "react-hook-form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface AddressFormValues {
  name: string;
  email: string;
  phone: string;
  address: string;
  pincode: string;
  district: string;
  landmark?: string;
}

interface AddressFormProps {
  register: UseFormRegister<AddressFormValues>;
  errors: FieldErrors<AddressFormValues>;
}

export function AddressForm({ register, errors }: AddressFormProps) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Full Name <span className="text-destructive">*</span></Label>
          <Input
            id="name"
            {...register("name")}
            placeholder="Enter full name"
            aria-invalid={!!errors.name}
            aria-describedby={errors.name ? "name-error" : undefined}
          />
          {errors.name && (
            <p id="name-error" className="text-sm text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email <span className="text-destructive">*</span></Label>
          <Input
            id="email"
            type="email"
            {...register("email")}
            placeholder="you@example.com"
            aria-invalid={!!errors.email}
            aria-describedby={errors.email ? "email-error" : undefined}
          />
          {errors.email && (
            <p id="email-error" className="text-sm text-destructive">{errors.email.message}</p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number <span className="text-destructive">*</span></Label>
        <Input
          id="phone"
          {...register("phone")}
          placeholder="10-digit mobile number"
          aria-invalid={!!errors.phone}
          aria-describedby={errors.phone ? "phone-error" : undefined}
        />
        {errors.phone && (
          <p id="phone-error" className="text-sm text-destructive">{errors.phone.message}</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="address">Delivery Address <span className="text-destructive">*</span></Label>
        <Input
          id="address"
          {...register("address")}
          placeholder="House no., street, area, city"
          aria-invalid={!!errors.address}
          aria-describedby={errors.address ? "address-error" : undefined}
        />
        {errors.address && (
          <p id="address-error" className="text-sm text-destructive">{errors.address.message}</p>
        )}
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="pincode">Pincode <span className="text-destructive">*</span></Label>
          <Input
            id="pincode"
            inputMode="numeric"
            maxLength={6}
            {...register("pincode")}
            placeholder="6-digit pincode"
            aria-invalid={!!errors.pincode}
            aria-describedby={errors.pincode ? "pincode-error" : undefined}
          />
          {errors.pincode && (
            <p id="pincode-error" className="text-sm text-destructive">{errors.pincode.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="district">District <span className="text-destructive">*</span></Label>
          <Input
            id="district"
            {...register("district")}
            placeholder="District / City"
            aria-invalid={!!errors.district}
            aria-describedby={errors.district ? "district-error" : undefined}
          />
          {errors.district && (
            <p id="district-error" className="text-sm text-destructive">{errors.district.message}</p>
          )}
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="landmark">Landmark (Optional)</Label>
        <Input id="landmark" {...register("landmark")} placeholder="Nearby landmark (optional)" />
      </div>
    </div>
  );
}
