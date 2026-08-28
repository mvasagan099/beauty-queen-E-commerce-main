"use client";

import { UseFormRegister, FieldErrors } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddressForm, AddressFormValues } from "./AddressForm";
import { PaymentMethod } from "./PaymentMethod";

interface CheckoutFormProps {
  register: UseFormRegister<AddressFormValues>;
  errors: FieldErrors<AddressFormValues>;
  paymentMethod: "upi" | "cod";
  onPaymentMethodChange: (value: "upi" | "cod") => void;
}

export function CheckoutForm({
  register,
  errors,
  paymentMethod,
  onPaymentMethodChange,
}: CheckoutFormProps) {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Billing Details</CardTitle>
        </CardHeader>
        <CardContent>
          <AddressForm register={register} errors={errors} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment Method</CardTitle>
        </CardHeader>
        <CardContent>
          <PaymentMethod value={paymentMethod} onChange={onPaymentMethodChange} />
        </CardContent>
      </Card>
    </div>
  );
}
