"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";

export function OnboardingRedirect({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { userId, isLoaded: isAuthLoaded } = useAuth();

  const { data: preferences, isLoading: isPrefsLoading, isError: isPrefsError } = useQuery({
    queryKey: ["user-preferences"],
    queryFn: async () => {
      const res = await fetch("/api/user/preferences");
      if (!res.ok) throw new Error("Failed to load preferences");
      return res.json();
    },
    enabled: !!userId,
    staleTime: 30_000,
    retry: 3,
    refetchOnMount: true,
  });

  const [decision, setDecision] = useState<"loading" | "redirect" | "show">("loading");

  useEffect(() => {
    if (!isAuthLoaded || isPrefsLoading) return;
    if (!userId) {
      setDecision("show");
      return;
    }
    if (isPrefsError) {
      // Never silently skip onboarding: if we can't confirm completion, the
      // onboarding page itself will make the same check and recover.
      setDecision("redirect");
      return;
    }
    const onboardingComplete = preferences?.onboardingComplete;
    if (!onboardingComplete) {
      setDecision("redirect");
    } else {
      setDecision("show");
    }
  }, [isAuthLoaded, isPrefsLoading, userId, preferences, isPrefsError]);

  useEffect(() => {
    if (decision === "redirect" && pathname !== "/onboarding") {
      router.replace("/onboarding");
    }
  }, [decision, pathname, router]);

  if (decision === "loading") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary/30 border-t-primary" />
      </div>
    );
  }

  return <>{children}</>;
}
