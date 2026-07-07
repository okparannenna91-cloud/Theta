import { PostHog } from "posthog-node";

let client: PostHog | null = null;

export function getServerPostHog(): PostHog | null {
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

  if (!key) return null;

  if (!client) {
    client = new PostHog(key, {
      host,
      flushAt: 20,
      flushInterval: 10000,
    });
  }
  return client;
}

export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
) {
  try {
    const ph = getServerPostHog();
    if (!ph) return;
    ph.capture({
      distinctId,
      event,
      properties,
    });
    await ph.flush();
  } catch {
    // Analytics failures must never break the app
  }
}

export async function identifyServerUser(
  distinctId: string,
  traits: Record<string, unknown>
) {
  try {
    const ph = getServerPostHog();
    if (!ph) return;
    ph.identify({
      distinctId,
      properties: traits,
    });
    await ph.flush();
  } catch {
    // Analytics failures must never break the app
  }
}
