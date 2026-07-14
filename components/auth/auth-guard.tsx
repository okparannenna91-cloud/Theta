"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter, usePathname } from "next/navigation";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!isLoaded) return;
    if (isSignedIn) return;

    const redirectUrl = encodeURIComponent(pathname);
    router.replace(`/sign-in?redirect_url=${redirectUrl}`);
  }, [isLoaded, isSignedIn, pathname, router]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
          <p className="text-sm text-muted-foreground">Verifying your session...</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
