"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Something Went Wrong | Theta PM",
  description: "Something went wrong on Theta PM. Please try again or go back to the homepage.",
  path: "/error",
  noIndex: true,
});

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="flex flex-col items-center gap-8 text-center max-w-md px-4">
        <Logo size="xl" />
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">Something went wrong</h1>
          <p className="text-sm text-muted-foreground">{error.message}</p>
        </div>
        <Button onClick={reset}>Try again</Button>
      </div>
    </div>
  );
}
