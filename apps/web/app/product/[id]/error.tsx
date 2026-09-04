"use client";

import { Button } from "@/components/ui/button";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

export default function ProductError() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="h-20 w-20 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertTriangle className="h-10 w-10 text-destructive" />
      </div>
      <div className="text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">
          Product Not Found
        </h2>
        <p className="text-muted-foreground max-w-md">
          We couldn&apos;t find this product. It may have been removed or the link might be incorrect.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Back to Home
          </Button>
        </Link>
        <Link href="/saree">
          <Button variant="outline">
            Browse Collections
          </Button>
        </Link>
      </div>
    </div>
  );
}
