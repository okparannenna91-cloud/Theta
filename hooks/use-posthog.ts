"use client";

import { useCallback } from "react";
import { getPostHogClient } from "@/lib/posthog-client";
import { useUser } from "@clerk/nextjs";

export type EventProperties = Record<string, unknown>;

export function usePostHog() {
  const { user } = useUser();

  const capture = useCallback(
    (event: string, properties?: EventProperties) => {
      try {
        const ph = getPostHogClient();
        if (!ph) return;

        ph.capture(event, {
          ...properties,
          user_id: user?.id || null,
          environment: process.env.NODE_ENV,
        });
      } catch {
        // Analytics failures must never break the app
      }
    },
    [user]
  );

  const identify = useCallback(
    (traits: Record<string, unknown>) => {
      try {
        const ph = getPostHogClient();
        if (!ph || !user) return;

        ph.identify(user.id, traits);
      } catch {
        // Analytics failures must never break the app
      }
    },
    [user]
  );

  const reset = useCallback(() => {
    try {
      const ph = getPostHogClient();
      if (!ph) return;
      ph.reset();
    } catch {
      // Analytics failures must never break the app
    }
  }, []);

  return { capture, identify, reset };
}
