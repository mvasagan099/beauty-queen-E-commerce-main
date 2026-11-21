"use client";

import { CartItem as CartItemType } from "@/types";
import { CartItem } from "./CartItem";

interface CartListProps {
  items: CartItemType[];
  onQuantityChange: (itemId: number, quantity: number) => void;
  onSizeChange?: (itemId: number, size: string, quantity: number) => void;
  onRemove: (itemId: number) => void;
  updating: boolean;
}

export function CartList({
  items,
  onQuantityChange,
  onSizeChange,
  onRemove,
  updating,
}: CartListProps) {
  return (
    <div className="space-y-4">
      {items.map((item) => (
        <CartItem
          key={`${item.id}-${item.size}`}
          item={item}
          onQuantityChange={onQuantityChange}
          onSizeChange={onSizeChange}
          onRemove={onRemove}
          updating={updating}
        />
      ))}
    </div>
  );
}
