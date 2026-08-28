import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface StatCardProps {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
  hint?: string;
  accent?: "pink" | "blue" | "green" | "yellow" | "purple" | "orange" | "red" | "gray";
}

const accentMap: Record<NonNullable<StatCardProps["accent"]>, string> = {
  pink: "bg-pink-100 text-pink-600",
  blue: "bg-blue-100 text-blue-600",
  green: "bg-green-100 text-green-600",
  yellow: "bg-yellow-100 text-yellow-600",
  purple: "bg-purple-100 text-purple-600",
  orange: "bg-orange-100 text-orange-600",
  red: "bg-red-100 text-red-600",
  gray: "bg-gray-100 text-gray-600",
};

export function StatCard({
  label,
  value,
  icon,
  hint,
  accent = "pink",
}: StatCardProps) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center gap-3">
          {icon && (
            <div
              className={cn(
                "rounded-full p-3",
                accentMap[accent]
              )}
            >
              {icon}
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-bold text-gray-900 truncate">{value}</p>
            {hint && <p className="text-xs text-gray-400 mt-0.5">{hint}</p>}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
