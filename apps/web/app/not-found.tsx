import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SearchX } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center">
        <SearchX className="h-10 w-10 text-primary" />
      </div>
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary mb-2">404</h1>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Page Not Found
        </h2>
        <p className="text-muted-foreground max-w-md">
          The page you&apos;re looking for doesn&apos;t exist or may have been moved. Let&apos;s get you back on track.
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
