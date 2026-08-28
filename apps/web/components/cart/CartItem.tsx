"use client";

import Image from "next/image";
import { CartItem as CartItemType } from "@/types";
import { formatPrice, getProductImageUrl } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";

interface CartItemProps {
  item: CartItemType;
  onQuantityChange: (itemId: number, quantity: number) => void;
  onRemove: (itemId: number) => void;
  updating: boolean;
}

export function CartItem({ item, onQuantityChange, onRemove, updating }: CartItemProps) {
  return (
    <Card>
      <CardContent className="p-4 flex gap-4">
        <div className="relative h-24 w-24 flex-shrink-0 rounded-md overflow-hidden bg-gray-100">
          <Image
            src={getProductImageUrl(item.image)}
            alt={item.name}
            fill
            sizes="96px"
            className="object-cover"
            unoptimized
          />
        </div>
        <div className="flex-1">
          <h3 className="font-medium text-gray-900">{item.name}</h3>
          <p className="text-sm text-gray-500">Size: {item.size}</p>
          <p className="text-pink-500 font-bold mt-1">{formatPrice(item.price)}</p>
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={() =>
                onQuantityChange(item.id, Math.max(1, item.quantity - 1))
              }
              disabled={item.quantity <= 1 || updating}
              className="h-7 w-7 rounded border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
              aria-label="Decrease quantity"
            >
              -
            </button>
            <span className="w-8 text-center text-sm">{item.quantity}</span>
            <button
              onClick={() => onQuantityChange(item.id, item.quantity + 1)}
              disabled={updating}
              className="h-7 w-7 rounded border border-gray-300 text-sm hover:bg-gray-50 disabled:opacity-50"
              aria-label="Increase quantity"
            >
              +
            </button>
          </div>
        </div>
        <div className="text-right">
          <p className="font-bold">{formatPrice(item.subtotal)}</p>
          <button
            onClick={() => onRemove(item.id)}
            disabled={updating}
            className="mt-2 text-sm text-red-500 hover:underline disabled:opacity-50"
          >
            Remove
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
