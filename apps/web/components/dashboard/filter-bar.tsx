"use client";

export interface FilterOption {
  value: string;
  label: string;
}

export function FilterBar({
  label,
  value,
  onChange,
  options,
  allLabel = "All",
  className,
}: {
  label?: string;
  value: string;
  onChange: (value: string) => void;
  options: FilterOption[];
  allLabel?: string;
  className?: string;
}) {
  return (
    <label className={`flex items-center gap-2 ${className ?? ""}`}>
      {label && <span className="text-sm font-medium text-gray-600">{label}</span>}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 rounded-md border border-input bg-background px-3 text-sm"
      >
        <option value="">{allLabel}</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
