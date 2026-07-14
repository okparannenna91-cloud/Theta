import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-8 text-center max-w-md px-4">
        <Logo size="xl" />
        <div>
          <h1 className="text-6xl font-bold text-foreground mb-2">404</h1>
          <p className="text-sm text-muted-foreground">Page not found</p>
        </div>
        <Link href="/">
          <Button>Go Home</Button>
        </Link>
      </div>
    </div>
  );
}

