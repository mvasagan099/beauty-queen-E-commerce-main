import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export default function ForbiddenPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="h-20 w-20 rounded-full bg-red-100 flex items-center justify-center">
        <ShieldAlert className="h-10 w-10 text-red-600" />
      </div>
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary mb-2">403</h1>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Access Denied
        </h2>
        <p className="text-muted-foreground max-w-md">
          You don&apos;t have permission to access this page. If you believe this is an error, please contact support.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Back to Home
          </Button>
        </Link>
        <Link href="/contact">
          <Button variant="outline">
            Contact Support
          </Button>
        </Link>
      </div>
    </div>
  );
}
