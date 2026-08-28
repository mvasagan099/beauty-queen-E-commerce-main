"use client";

export default function SearchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[40vh] gap-4">
      <p className="text-red-500">Something went wrong while searching.</p>
      <p className="text-gray-500 text-sm">{error.message}</p>
      <button
        onClick={reset}
        className="inline-flex items-center justify-center rounded-md bg-pink-500 px-6 py-3 text-sm font-medium text-white hover:bg-pink-600 transition-colors"
      >
        Try Again
      </button>
    </div>
  );
}
