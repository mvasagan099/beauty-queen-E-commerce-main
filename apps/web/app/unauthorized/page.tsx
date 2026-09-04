import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldOff } from "lucide-react";

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="h-20 w-20 rounded-full bg-yellow-100 flex items-center justify-center">
        <ShieldOff className="h-10 w-10 text-yellow-600" />
      </div>
      <div className="text-center">
        <h1 className="text-6xl font-bold text-primary mb-2">401</h1>
        <h2 className="text-2xl font-semibold text-foreground mb-2">
          Authentication Required
        </h2>
        <p className="text-muted-foreground max-w-md">
          You need to be signed in to access this page. Please log in to continue.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/login">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Sign In
          </Button>
        </Link>
        <Link href="/">
          <Button variant="outline">
            Back to Home
          </Button>
        </Link>
      </div>
    </div>
  );
}
