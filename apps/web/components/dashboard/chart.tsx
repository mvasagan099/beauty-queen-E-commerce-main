import React from "react";

export interface ChartDatum {
  label: string;
  value: number;
  color?: string;
}

/** A lightweight, dependency-free horizontal bar chart for breakdown data. */
export function BarChart({
  data,
  max,
  unit,
}: {
  data: ChartDatum[];
  max?: number;
  unit?: string;
}) {
  const highest = max ?? Math.max(1, ...data.map((d) => d.value));

  if (data.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-gray-400">No data</div>
    );
  }

  return (
    <div className="space-y-3">
      {data.map((d) => (
        <div key={d.label} className="flex items-center gap-3">
          <span className="w-24 flex-shrink-0 text-sm text-gray-600 truncate">
            {d.label}
          </span>
          <div className="flex-1 h-5 rounded bg-gray-100 overflow-hidden">
            <div
              className="h-full rounded transition-all duration-300"
              style={{
                width: `${Math.max(0, Math.min(100, (d.value / highest) * 100))}%`,
                backgroundColor: d.color || "#ec4899",
              }}
            />
          </div>
          <span className="w-16 flex-shrink-0 text-right text-sm font-medium text-gray-900">
            {d.value}
            {unit ? ` ${unit}` : ""}
          </span>
        </div>
      ))}
    </div>
  );
}
