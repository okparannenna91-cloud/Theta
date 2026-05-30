import posthog from "posthog-js";

let initialized = false;

export function getPostHogClient() {
  if (typeof window === "undefined") return null;

  if (!initialized) {
    const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
    const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

    if (!key) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[PostHog] Missing NEXT_PUBLIC_POSTHOG_KEY");
      }
      return null;
    }

    try {
      posthog.init(key, {
        api_host: host,
        capture_pageview: true,
        capture_pageleave: true,
        person_profiles: "identified_only",
        session_recording: {
          maskAllInputs: true,
          maskInputOptions: {
            password: true,
            email: true,
          },
        },
        autocapture: true,
        loaded: () => {
          initialized = true;
        },
      });
    } catch {
      return null;
    }
  }

  return posthog;
}

export function resetPostHog() {
  if (typeof window === "undefined") return;
  try {
    posthog.reset();
    initialized = false;
  } catch {
    // noop
  }
}
