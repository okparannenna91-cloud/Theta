"use client";

import { useUser } from "@clerk/nextjs";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect, useRef } from "react";
import { getPostHogClient, resetPostHog } from "@/lib/posthog-client";
import { useWorkspace } from "@/hooks/use-workspace";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const { user } = useUser();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { activeWorkspace } = useWorkspace();
  const identifiedRef = useRef(false);

  // Identify user when auth state changes
  useEffect(() => {
    const ph = getPostHogClient();
    if (!ph) return;

    if (user) {
      ph.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
        username: user.username,
        imageUrl: user.imageUrl,
      });
      identifiedRef.current = true;
    } else if (identifiedRef.current) {
      resetPostHog();
      identifiedRef.current = false;
    }
  }, [user]);

  // Group identification when workspace changes
  useEffect(() => {
    const ph = getPostHogClient();
    if (!ph || !activeWorkspace || !user) return;

    ph.group("workspace", activeWorkspace.id, {
      name: activeWorkspace.name,
      plan: activeWorkspace.plan,
      slug: activeWorkspace.slug,
    });
  }, [activeWorkspace, user]);

  // Pageview tracking is handled by PostHog's capture_pageview config, no manual capture needed
  useEffect(() => {
    const ph = getPostHogClient();
    if (!ph) return;
    ph.register({ workspace_id: activeWorkspace?.id || null });
  }, [activeWorkspace]);

  return <>{children}</>;
}
