import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function ConfirmationPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <div className="h-20 w-20 rounded-full bg-green-100 flex items-center justify-center">
        <svg
          className="h-10 w-10 text-green-500"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Order Placed Successfully!
        </h1>
        <p className="text-gray-500">
          Thank you for shopping with Beauty Queen. You will receive an email
          confirmation shortly.
        </p>
      </div>
      <div className="flex gap-3">
        <Link href="/orders">
          <Button variant="outline" className="border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white">
            View Orders
          </Button>
        </Link>
        <Link href="/">
          <Button className="bg-pink-500 hover:bg-pink-600 text-white">
            Continue Shopping
          </Button>
        </Link>
      </div>
    </div>
  );
}
