"use client";

import { CreditCard, Banknote } from "lucide-react";
import { cn } from "@/lib/utils";

interface PaymentMethodProps {
  value: "upi" | "cod";
  onChange: (value: "upi" | "cod") => void;
}

export function PaymentMethod({ value, onChange }: PaymentMethodProps) {
  const options: { value: "upi" | "cod"; label: string; description: string; icon: React.ReactNode }[] = [
    {
      value: "upi",
      label: "UPI / Online Payment",
      description: "Pay securely via Razorpay",
      icon: <CreditCard className="h-5 w-5" />,
    },
    {
      value: "cod",
      label: "Cash on Delivery",
      description: "Pay when your order arrives",
      icon: <Banknote className="h-5 w-5" />,
    },
  ];

  return (
    <div className="space-y-3" role="radiogroup" aria-label="Payment method">
      {options.map((option) => (
        <label
          key={option.value}
          className={`flex items-center gap-4 p-4 rounded-xl border-2 cursor-pointer transition-all ${
            value === option.value
              ? "border-primary bg-primary/5"
              : "border-border hover:border-primary/40"
          }`}
        >
          <input
            type="radio"
            name="payment"
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="sr-only"
          />
          <div className={`rounded-lg p-2 ${
            value === option.value ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
          }`}>
            {option.icon}
          </div>
          <div className="flex-1">
            <span className="text-sm font-medium text-foreground">{option.label}</span>
            <p className="text-xs text-muted-foreground mt-0.5">{option.description}</p>
          </div>
          <div className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-colors ${
            value === option.value ? "border-primary" : "border-border"
          }`}>
            {value === option.value && (
              <div className="h-2.5 w-2.5 rounded-full bg-primary" />
            )}
          </div>
        </label>
      ))}
    </div>
  );
}
