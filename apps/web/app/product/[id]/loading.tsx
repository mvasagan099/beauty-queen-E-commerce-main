import { Skeleton } from "@/components/ui/skeleton";

export default function ProductLoading() {
  return (
    <div className="container-page py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
        <div>
          <Skeleton className="aspect-[3/4] w-full rounded-xl" />
          <div className="flex gap-2 mt-4">
            {[1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="h-16 w-16 sm:h-20 sm:w-20 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="space-y-5">
          <div className="space-y-2">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/4" />
          </div>
          <div className="flex items-center gap-3">
            <Skeleton className="h-8 w-24" />
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-14 rounded-full" />
          </div>
          <Skeleton className="h-5 w-20 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
          <div className="space-y-3">
            <Skeleton className="h-5 w-20" />
            <div className="flex gap-2">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-10 w-10 rounded-lg" />
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <Skeleton className="h-12 flex-1 rounded-md" />
            <Skeleton className="h-12 flex-1 rounded-md" />
            <Skeleton className="h-12 w-12 rounded-md" />
          </div>
        </div>
      </div>
    </div>
  );
}
