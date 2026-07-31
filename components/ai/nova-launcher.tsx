"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export function NovaLauncher() {
  const router = useRouter();

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      const prompt = detail?.prompt || "";
      const params = prompt ? `?prompt=${encodeURIComponent(prompt)}` : "";
      router.push(`/nova${params}`);
    };
    window.addEventListener("nova:open", handler);
    return () => window.removeEventListener("nova:open", handler);
  }, [router]);

  return null;
}
