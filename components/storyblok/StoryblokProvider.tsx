"use client";

import { storyblokInit, apiPlugin } from "@storyblok/react";
import { storyblokComponents } from "./components";

let initialized = false;

export function initStoryblok() {
  if (initialized) return;
  initialized = true;
  storyblokInit({
    accessToken: process.env.NEXT_PUBLIC_STORYBLOK_TOKEN || process.env.STORYBLOK_TOKEN || "",
    use: [apiPlugin],
    components: storyblokComponents,
    // Bridge enabled for visual editor live updates (postMessage); preview token never exposed.
    bridge: true,
    apiOptions: {
      region: (process.env.NEXT_PUBLIC_STORYBLOK_API_REGION as "eu" | "us") || "eu",
    },
  });
}

export default function StoryblokProvider({ children }: { children: React.ReactNode }) {
  initStoryblok();
  return <>{children}</>;
}
