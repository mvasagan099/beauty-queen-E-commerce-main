"use client";

interface PaymentMethodProps {
  value: "upi" | "cod";
  onChange: (value: "upi" | "cod") => void;
}

export function PaymentMethod({ value, onChange }: PaymentMethodProps) {
  const options: { value: "upi" | "cod"; label: string }[] = [
    { value: "cod", label: "Cash on Delivery" },
    { value: "upi", label: "UPI / Online" },
  ];

  return (
    <div className="flex gap-4">
      {options.map((option) => (
        <label key={option.value} className="flex items-center gap-2 cursor-pointer">
          <input
            type="radio"
            name="payment"
            value={option.value}
            checked={value === option.value}
            onChange={() => onChange(option.value)}
            className="accent-pink-500"
          />
          <span>{option.label}</span>
        </label>
      ))}
    </div>
  );
}
