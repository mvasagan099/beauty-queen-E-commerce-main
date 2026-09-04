import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CheckCircle, ArrowRight } from "lucide-react";

export default function ConfirmationPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4 py-12">
      <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
        <CheckCircle className="h-10 w-10 text-green-600" />
      </div>
      <div className="text-center">
        <h1 className="text-3xl font-bold text-foreground mb-2">
          Order Placed Successfully!
        </h1>
        <p className="text-muted-foreground max-w-md">
          Thank you for shopping with Beauty Queen. You will receive an email
          confirmation shortly with your order details.
        </p>
      </div>
      <div className="flex flex-col sm:flex-row gap-3">
        <Link href="/orders">
          <Button variant="outline" className="gap-2">
            View Orders
            <ArrowRight className="h-4 w-4" />
          </Button>
        </Link>
        <Link href="/">
          <Button className="bg-primary hover:bg-primary/90 text-primary-foreground">
            Continue Shopping
          </Button>
        </Link>
      </div>
    </div>
  );
}
