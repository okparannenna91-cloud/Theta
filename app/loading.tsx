import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="space-y-6 w-full max-w-md px-8">
        <div className="flex flex-col items-center gap-4">
          <Skeleton className="h-14 w-14 rounded-2xl" />
          <Skeleton className="h-5 w-56" />
        </div>
        <div className="space-y-3">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-4/5 mx-auto" />
          <Skeleton className="h-3 w-3/5 mx-auto" />
        </div>
      </div>
    </div>
  );
}
