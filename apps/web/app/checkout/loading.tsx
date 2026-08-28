export default function CheckoutLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">Checkout</h1>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="h-8 bg-gray-100 rounded animate-pulse w-1/3" />
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-gray-100 rounded animate-pulse" />
          ))}
        </div>
        <div className="space-y-4">
          <div className="h-8 bg-gray-100 rounded animate-pulse w-1/3" />
          <div className="h-40 bg-gray-100 rounded animate-pulse" />
        </div>
      </div>
    </div>
  );
}
