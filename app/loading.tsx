import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="space-y-4 w-full max-w-md">
        <Skeleton className="h-8 w-64 mx-auto" />
        <Skeleton className="h-64" />
      </div>
    </div>
  );
}

