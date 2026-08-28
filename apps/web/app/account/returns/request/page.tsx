"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { returnsApi, refundsApi } from "@/lib/api";
import { formatPrice } from "@/lib/utils";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function ReturnRequestPage() {
  const searchParams = useSearchParams();
  const [orderId, setOrderId] = useState(searchParams.get("orderId") || "");
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const queryClient = useQueryClient();

  const requestReturn = useMutation({
    mutationFn: (data: { orderId: number; reason: string; note?: string }) =>
      returnsApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-returns"] });
      setOrderId("");
      setReason("");
      setNote("");
      toast.success("Return request submitted successfully");
    },
    onError: (err: Error) => {
      toast.error(err.message || "Failed to submit return request");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId || !reason) return;
    requestReturn.mutate({
      orderId: parseInt(orderId),
      reason,
      note: note || undefined,
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-2xl">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Request a Return</h1>

      <Card>
        <CardHeader>
          <CardTitle>Return Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="orderId">Order ID</Label>
              <Input
                id="orderId"
                type="number"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
                placeholder="Enter your order ID"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="reason">Reason for Return</Label>
              <select
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                required
              >
                <option value="">Select a reason</option>
                <option value="Product does not match description">Product does not match description</option>
                <option value="Wrong item received">Wrong item received</option>
                <option value="Size too small">Size too small</option>
                <option value="Size too large">Size too large</option>
                <option value="Damaged or defective">Damaged or defective</option>
                <option value="Quality not as expected">Quality not as expected</option>
                <option value="Changed my mind">Changed my mind</option>
                <option value="Other">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="note">Additional Notes (Optional)</Label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Provide any additional details..."
                className="h-20 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <Button
              type="submit"
              className="bg-pink-500 hover:bg-pink-600 text-white"
              disabled={requestReturn.isPending || !orderId || !reason}
            >
              {requestReturn.isPending ? "Submitting..." : "Submit Return Request"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
