"use client";

import Image from "next/image";
import { CartItem as CartItemType } from "@/types";
import { formatPrice, getProductImageUrl } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2 } from "lucide-react";

interface CartItemProps {
  item: CartItemType;
  onQuantityChange: (itemId: number, quantity: number) => void;
  onRemove: (itemId: number) => void;
  updating: boolean;
}

export function CartItem({ item, onQuantityChange, onRemove, updating }: CartItemProps) {
  return (
    <Card>
      <CardContent className="p-4 flex gap-3 sm:gap-4">
        <div className="relative h-20 w-20 sm:h-24 sm:w-24 flex-shrink-0 rounded-lg overflow-hidden bg-gray-100">
          <Image
            src={getProductImageUrl(item.image)}
            alt={item.name}
            fill
            sizes="96px"
            className="object-cover"
            unoptimized
          />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-foreground truncate text-sm sm:text-base">{item.name}</h3>
          <p className="text-xs sm:text-sm text-muted-foreground mt-0.5">Size: {item.size}</p>
          <p className="text-primary font-bold mt-1 text-sm sm:text-base">{formatPrice(item.price)}</p>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex items-center rounded-md border border-input">
              <button
                onClick={() =>
                  onQuantityChange(item.id, Math.max(1, item.quantity - 1))
                }
                disabled={item.quantity <= 1 || updating}
                className="h-8 w-8 flex items-center justify-center text-sm hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Decrease quantity"
              >
                -
              </button>
              <span className="w-10 text-center text-sm font-medium tabular-nums" aria-live="polite">
                {item.quantity}
              </span>
              <button
                onClick={() => onQuantityChange(item.id, item.quantity + 1)}
                disabled={updating}
                className="h-8 w-8 flex items-center justify-center text-sm hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </div>
        </div>
        <div className="text-right flex flex-col items-end">
          <p className="font-bold text-foreground text-sm sm:text-base">{formatPrice(item.subtotal)}</p>
          <button
            onClick={() => onRemove(item.id)}
            disabled={updating}
            className="mt-auto p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
            aria-label={`Remove ${item.name} from cart`}
            title="Remove item"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </CardContent>
    </Card>
  );
}
