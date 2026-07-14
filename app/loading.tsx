import { Logo } from "@/components/ui/logo";

export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col items-center gap-6">
        <Logo size="xl" priority />
        <div className="h-1 w-48 rounded-full bg-muted overflow-hidden">
          <div className="h-full w-1/2 bg-primary animate-pulse rounded-full" />
        </div>
      </div>
    </div>
  );
}
