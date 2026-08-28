import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 px-4">
      <h1 className="text-6xl font-bold text-pink-500">404</h1>
      <h2 className="text-2xl font-semibold text-gray-900">Page Not Found</h2>
      <p className="text-gray-500 text-center max-w-md">
        The page you are looking for might have been removed, had its name
        changed, or is temporarily unavailable.
      </p>
      <Link
        href="/"
        className="inline-flex items-center justify-center rounded-md bg-pink-500 px-6 py-3 text-sm font-medium text-white hover:bg-pink-600 transition-colors"
      >
        Back to Home
      </Link>
    </div>
  );
}
