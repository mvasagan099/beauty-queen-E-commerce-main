"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Application Error]", error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertTriangle className="h-10 w-10 text-destructive" />
      </div>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Something Went Wrong
        </h2>
        <p className="text-muted-foreground max-w-md">
          An unexpected error occurred. Please try again or return to the homepage.
        </p>
        {error.digest && (
          <p className="text-xs text-muted-foreground/60 mt-2 font-mono">
            Error ID: {error.digest}
          </p>
        )}
      </div>
      <div className="flex gap-3">
        <Button
          onClick={reset}
          className="bg-primary hover:bg-primary/90 text-primary-foreground"
        >
          Try Again
        </Button>
        <Button
          variant="outline"
          onClick={() => (window.location.href = "/")}
        >
          Go to Homepage
        </Button>
      </div>
    </div>
  );
}
