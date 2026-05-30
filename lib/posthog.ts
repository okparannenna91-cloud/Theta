import { PostHog } from "posthog-node";

export function getServerPostHog(): PostHog {
  const client = new PostHog(
    process.env.NEXT_PUBLIC_POSTHOG_KEY || "",
    {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
      flushAt: 20,
      flushInterval: 10000,
    }
  );
  return client;
}

export async function captureServerEvent(
  distinctId: string,
  event: string,
  properties?: Record<string, unknown>
) {
  try {
    const client = getServerPostHog();
    client.capture({
      distinctId,
      event,
      properties,
    });
    await client.flush();
  } catch {
    // Analytics failures must never break the app
  }
}

export async function identifyServerUser(
  distinctId: string,
  traits: Record<string, unknown>
) {
  try {
    const client = getServerPostHog();
    client.identify({
      distinctId,
      properties: traits,
    });
    await client.flush();
  } catch {
    // Analytics failures must never break the app
  }
}
