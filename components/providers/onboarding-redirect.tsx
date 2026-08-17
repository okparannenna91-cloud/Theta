"use client";

import { useEffect, useState, ReactNode } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";

export function OnboardingRedirect({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { userId, isLoaded: isAuthLoaded } = useAuth();
  const { workspaces, isLoading: isWorkspacesLoading, error: workspaceError } = useWorkspace();

  const { data: preferences, isLoading: isPrefsLoading, isError: isPrefsError } = useQuery({
    queryKey: ["user-preferences"],
    queryFn: async () => {
      const res = await fetch("/api/user/preferences");
      if (!res.ok) throw new Error("Failed to load preferences");
      return res.json();
    },
    enabled: !!userId,
    staleTime: 30_000,
  });

  const [decision, setDecision] = useState<"loading" | "redirect" | "show">("loading");

  useEffect(() => {
    if (!isAuthLoaded || isPrefsLoading || isWorkspacesLoading) return;
    if (!userId) {
      setDecision("show");
      return;
    }
    if (isPrefsError || workspaceError) {
      setDecision("show");
      return;
    }
    const onboardingComplete = preferences?.onboardingComplete;
    const userCreatedAt = preferences?.userCreatedAt ? new Date(preferences.userCreatedAt).getTime() : null;
    const isNewUser = userCreatedAt !== null && Date.now() - userCreatedAt < 24 * 60 * 60 * 1000;
    const hasWorkspaces = Array.isArray(workspaces) && workspaces.length > 0;
    // New users always go through onboarding, even when an automatic workspace
    // ("X's Workspace") already exists — otherwise the auto-creation bypasses it.
    if (!onboardingComplete && (isNewUser || !hasWorkspaces)) {
      setDecision("redirect");
    } else {
      setDecision("show");
    }
  }, [isAuthLoaded, isPrefsLoading, isWorkspacesLoading, userId, preferences, workspaces, isPrefsError, workspaceError]);

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
