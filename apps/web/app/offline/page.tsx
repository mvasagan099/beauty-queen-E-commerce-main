"use client";

import Link from "next/link";
import { WifiOff, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OfflinePage() {
  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="max-w-md w-full rounded-2xl border border-border bg-card p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <WifiOff className="h-7 w-7" />
        </div>
        <h1 className="font-display text-3xl font-semibold text-foreground">
          You&apos;re Offline
        </h1>
        <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
          Your Beauty Queen bag and saved pieces are preserved on this device.
          Reconnect to browse live collections and complete checkout.
        </p>
        <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={() => window.location.reload()}
            className="bg-primary hover:bg-primary/90 text-primary-foreground gap-2"
          >
            <RefreshCw className="h-4 w-4" />
            Try Again
          </Button>
          <Link href="/">
            <Button variant="outline" className="w-full">
              Return Home
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
