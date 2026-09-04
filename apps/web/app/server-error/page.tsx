"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ServerCrash } from "lucide-react";

export default function ServerErrorPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center">
        <ServerCrash className="h-10 w-10 text-red-600" />
      </div>
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary mb-2">500</h1>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Server Error
        </h2>
        <p className="text-muted-foreground max-w-md">
          Something went wrong on our end. Our team has been notified and is working to fix the issue.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Back to Home
          </Button>
        </Link>
        <Button variant="outline" onClick={() => window.location.reload()}>
          Try Again
        </Button>
      </div>
    </div>
  );
}
