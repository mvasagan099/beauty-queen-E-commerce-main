"use client";

import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body>
        <div className="flex flex-col items-center justify-center min-h-screen gap-6 px-4 bg-background">
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
            <button
              onClick={reset}
              className="inline-flex items-center justify-center rounded-md bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Try Again
            </button>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-md border border-input bg-background px-6 py-3 text-sm font-medium hover:bg-accent transition-colors"
            >
              Go to Homepage
            </Link>
          </div>
        </div>
      </body>
    </html>
  );
}
