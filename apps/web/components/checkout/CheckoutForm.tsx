"use client";

import { useState } from "react";
import { UseFormRegister, UseFormSetValue, FieldErrors } from "react-hook-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AddressForm, AddressFormValues } from "./AddressForm";
import { AddressSelector } from "./AddressSelector";
import { PaymentMethod } from "./PaymentMethod";
import { Address } from "@/types";

interface CheckoutFormProps {
  register: UseFormRegister<AddressFormValues>;
  setValue: UseFormSetValue<AddressFormValues>;
  errors: FieldErrors<AddressFormValues>;
  paymentMethod: "upi" | "cod";
  onPaymentMethodChange: (value: "upi" | "cod") => void;
}

export function CheckoutForm({
  register,
  setValue,
  errors,
  paymentMethod,
  onPaymentMethodChange,
}: CheckoutFormProps) {
  const [showManualForm, setShowManualForm] = useState(false);

  const handleSelectSavedAddress = (address: Address) => {
    setValue("name", address.name, { shouldValidate: true });
    setValue("email", "", { shouldValidate: false });
    setValue("phone", address.phone, { shouldValidate: true });
    setValue("address", address.address, { shouldValidate: true });
    setValue("pincode", address.pincode, { shouldValidate: true });
    setValue("district", address.district, { shouldValidate: true });
    setValue("landmark", address.landmark || "", { shouldValidate: false });
    setShowManualForm(false);
  };

  const handleNewAddress = () => {
    setShowManualForm(true);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Shipping Address</CardTitle>
        </CardHeader>
        <CardContent>
          {!showManualForm && (
            <AddressSelector
              onSelect={handleSelectSavedAddress}
              onNewAddress={handleNewAddress}
            />
          )}
          {(showManualForm || false) && (
            <div className="space-y-4">
              {!showManualForm && (
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-gray-700">Enter new address</h3>
                  <button
                    type="button"
                    onClick={() => setShowManualForm(false)}
                    className="text-sm text-pink-500 hover:text-pink-600"
                  >
                    ← Back to saved addresses
                  </button>
                </div>
              )}
              {showManualForm && (
                <button
                  type="button"
                  onClick={() => setShowManualForm(false)}
                  className="text-sm text-pink-500 hover:text-pink-600 mb-4 inline-block"
                >
                  ← Use saved address
                </button>
              )}
              <AddressForm register={register} errors={errors} />
            </div>
          )}
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
