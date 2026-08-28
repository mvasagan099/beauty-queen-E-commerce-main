export default function ProductLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="aspect-square rounded-lg bg-gray-100 animate-pulse" />
        <div className="space-y-4">
          <div className="h-8 bg-gray-100 rounded animate-pulse w-3/4" />
          <div className="h-6 bg-gray-100 rounded animate-pulse w-1/4" />
          <div className="h-4 bg-gray-100 rounded animate-pulse w-full" />
          <div className="h-4 bg-gray-100 rounded animate-pulse w-2/3" />
          <div className="flex gap-2 mt-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-10 w-10 rounded-md bg-gray-100 animate-pulse" />
            ))}
          </div>
          <div className="h-12 bg-gray-100 rounded animate-pulse mt-8" />
          <div className="h-12 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
