"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Something went wrong
        </h2>
        <p className="text-gray-500">
          {error.message || "An unexpected error occurred."}
        </p>
      </div>
      <Button
        onClick={reset}
        className="bg-pink-500 hover:bg-pink-600 text-white"
      >
        Try Again
      </Button>
    </div>
  );
}
