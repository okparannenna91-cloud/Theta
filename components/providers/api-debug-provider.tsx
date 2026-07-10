"use client";

import { useEffect } from "react";

/**
 * Loads the API debug instrumentation in development or when
 * `?api-debug` query param is present or `sessionStorage` key is set.
 *
 * This component is tree-shaken in production builds — it only
 * activates when explicitly enabled.
 */
export function ApiDebugProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const shouldEnable =
      process.env.NODE_ENV === "development" ||
      window.location.search.includes("api-debug") ||
      sessionStorage.getItem("api-debug") === "1";

    if (!shouldEnable) return;

    import("@/lib/api-debug").then((mod) => {
      mod.enableApiDebug();

      // Log the comparison fixture to console
      console.info(
        "%c[API-DEBUG] To run a controlled mutation sequence:\n" +
        "%c  1. Open this page\n" +
        "%c  2. Perform mutation #1 (should succeed)\n" +
        "%c  3. Perform mutation #2 (may fail)\n" +
        "%c  4. Type `__apiDebug.table()` in the console\n" +
        "%c  5. Compare the two rows side by side",
        "color:#888",
        "color:#0cf",
        "color:#0cf",
        "color:#c60",
        "color:#0f0",
        "color:#f0f"
      );
    });
  }, []);

  return <>{children}</>;
}
