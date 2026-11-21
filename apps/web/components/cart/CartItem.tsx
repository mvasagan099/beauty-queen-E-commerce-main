"use client";

import Image from "next/image";
import Link from "next/link";
import { CartItem as CartItemType } from "@/types";
import { formatPrice, getProductImageUrl } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { Trash2 } from "lucide-react";

interface CartItemProps {
  item: CartItemType;
  onQuantityChange: (itemId: number, quantity: number) => void;
  onSizeChange?: (itemId: number, size: string, quantity: number) => void;
  onRemove: (itemId: number) => void;
  updating: boolean;
}

function formatSizeLabel(size: string) {
  if (size === "FREE_SIZE" || size === "ONE_SIZE") return "Free Size";
  return size;
}

export function CartItem({
  item,
  onQuantityChange,
  onSizeChange,
  onRemove,
  updating,
}: CartItemProps) {
  const maxStock = item.availableStock ?? 99;
  const atStockLimit = item.quantity >= maxStock;
  const canChangeSize =
    !!onSizeChange && !!item.availableSizes && item.availableSizes.length > 1;

  return (
    <Card>
      <CardContent className="p-4 flex gap-3 sm:gap-4">
        <Link
          href={`/product/${item.productId}`}
          className="relative h-24 w-20 sm:h-28 sm:w-24 flex-shrink-0 rounded-lg overflow-hidden bg-muted"
        >
          <Image
            src={getProductImageUrl(item.image)}
            alt={item.name}
            fill
            sizes="96px"
            className="object-cover"
            unoptimized
          />
        </Link>

        <div className="flex-1 min-w-0">
          <Link
            href={`/product/${item.productId}`}
            className="font-medium text-foreground hover:text-primary truncate block text-sm sm:text-base"
          >
            {item.name}
          </Link>

          <div className="mt-1 flex items-center gap-2">
            {canChangeSize ? (
              <label className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                <span>Size:</span>
                <select
                  value={item.size}
                  disabled={updating}
                  onChange={(e) => onSizeChange(item.id, e.target.value, item.quantity)}
                  aria-label={`Change size for ${item.name}`}
                  className="h-7 rounded border border-input bg-background px-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {item.availableSizes!.map((sz) => (
                    <option key={sz} value={sz}>
                      {formatSizeLabel(sz)}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <p className="text-xs sm:text-sm text-muted-foreground">
                Size: {formatSizeLabel(item.size)}
              </p>
            )}
          </div>

          <div className="mt-1 flex items-baseline gap-2">
            <p className="text-primary font-bold text-sm sm:text-base tabular-nums">
              {formatPrice(item.price)}
            </p>
            {item.mrp != null && item.mrp > item.price && (
              <span className="text-xs text-muted-foreground line-through tabular-nums">
                {formatPrice(item.mrp)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-2.5">
            <div className="flex items-center rounded-md border border-input">
              <button
                type="button"
                onClick={() =>
                  onQuantityChange(item.id, Math.max(1, item.quantity - 1))
                }
                disabled={item.quantity <= 1 || updating}
                className="h-8 w-8 flex items-center justify-center text-sm hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Decrease quantity"
              >
                -
              </button>
              <span
                className="w-10 text-center text-sm font-medium tabular-nums"
                aria-live="polite"
              >
                {item.quantity}
              </span>
              <button
                type="button"
                onClick={() => onQuantityChange(item.id, item.quantity + 1)}
                disabled={updating || atStockLimit}
                className="h-8 w-8 flex items-center justify-center text-sm hover:bg-muted transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
            {item.availableStock != null && item.availableStock <= 5 && (
              <span className="text-xs text-amber-700">
                Only {item.availableStock} in stock
              </span>
            )}
          </div>
        </div>

        <div className="text-right flex flex-col items-end">
          <p className="font-bold text-foreground text-sm sm:text-base tabular-nums">
            {formatPrice(item.subtotal)}
          </p>
          <button
            type="button"
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
