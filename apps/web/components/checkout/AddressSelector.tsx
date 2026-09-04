"use client";

import { useState } from "react";
import { useAddresses } from "@/hooks/use-account";
import { Address } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Plus, Check } from "lucide-react";

interface AddressSelectorProps {
  onSelect: (address: Address) => void;
  onNewAddress: () => void;
}

export function AddressSelector({ onSelect, onNewAddress }: AddressSelectorProps) {
  const { data, isLoading } = useAddresses();
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const addresses = data?.addresses || [];

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
        <div className="h-4 w-4 animate-spin rounded-full border-2 border-pink-500 border-t-transparent" />
        Loading addresses...
      </div>
    );
  }

  if (addresses.length === 0) {
    return (
      <button
        type="button"
        onClick={onNewAddress}
        className="w-full flex items-center justify-center gap-2 rounded-lg border-2 border-dashed border-gray-300 p-4 text-sm text-gray-600 hover:border-pink-400 hover:text-pink-600 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Add a new shipping address
      </button>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium text-gray-700">Choose a saved address:</p>
      <div className="space-y-2">
        {addresses.map((address) => (
          <Card
            key={address.id}
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedId === address.id
                ? "ring-2 ring-pink-500 border-pink-300"
                : "border-gray-200 hover:border-pink-200"
            }`}
            onClick={() => {
              setSelectedId(address.id);
              onSelect(address);
            }}
          >
            <CardContent className="p-3">
              <div className="flex items-start justify-between">
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                    selectedId === address.id
                      ? "border-pink-500 bg-pink-500"
                      : "border-gray-300"
                  }`}>
                    {selectedId === address.id && (
                      <Check className="h-3 w-3 text-white" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-sm">{address.name}</span>
                      {address.isDefault && (
                        <span className="rounded bg-pink-100 px-1.5 py-0.5 text-[10px] font-medium text-pink-600">
                          Default
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">{address.phone}</p>
                    <p className="text-xs text-gray-600 mt-0.5">
                      {address.address}, {address.district} - {address.pincode}
                    </p>
                    {address.landmark && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        Landmark: {address.landmark}
                      </p>
                    )}
                  </div>
                </div>
                <MapPin className="h-4 w-4 text-gray-400 flex-shrink-0" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <button
        type="button"
        onClick={onNewAddress}
        className="w-full flex items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 p-3 text-sm text-gray-600 hover:border-pink-400 hover:text-pink-600 transition-colors"
      >
        <Plus className="h-4 w-4" />
        Use a different address
      </button>
    </div>
  );
}
