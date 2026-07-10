"use client";

/**
 * Global API mutation debugger.
 *
 * Injects a `window.fetch` wrapper that logs every request with:
 *   - URL, method, headers, body
 *   - Response status, content-type, body
 *   - Workspace ID, user ID, Clerk session status
 *   - Mutation sequence counter
 *
 * Activate by adding `?api-debug` to any page URL or setting
 * `sessionStorage.setItem("api-debug", "1")` in the console.
 *
 * The fixture at the bottom lets you run a controlled sequence
 * so we can compare request #1 (success) vs request #2+ (failure).
 */

/* ------------------------------------------------------------------ */
/*  Types                                                             */
/* ------------------------------------------------------------------ */

interface DebugEntry {
  seq: number;
  url: string;
  method: string;
  requestHeaders: Record<string, string>;
  requestBody: string | null;
  responseStatus: number;
  responseStatusText: string;
  responseContentType: string;
  responseBody: string;
  workspaceId: string | null;
  userId: string | null;
  clerkSessionId: string | null;
  hasAuthHeader: boolean;
  timestamp: number;
  durationMs: number;
}

/* ------------------------------------------------------------------ */
/*  State                                                             */
/* ------------------------------------------------------------------ */

let seq = 0;
const MAX_ENTRIES = 50;
const entries: DebugEntry[] = [];
let originalFetch: typeof window.fetch | null = null;
let active = false;
let lazyAuth: { userId: string | null; sessionId: string | null } = { userId: null, sessionId: null };

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

function isMutationMethod(method: string): boolean {
  return ["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase());
}

function isApiUrl(url: string): boolean {
  try {
    const u = new URL(url, window.location.origin);
    return u.pathname.startsWith("/api/");
  } catch {
    return false;
  }
}

function truncate(str: string, max = 2000): string {
  if (str.length <= max) return str;
  return str.slice(0, max) + `… [truncated ${str.length - max} chars]`;
}

function readCookies(): string {
  return document.cookie
    .split("; ")
    .filter((c) => c.startsWith("__clerk") || c.startsWith("_clerk"))
    .join("; ");
}

function readBody(init: RequestInit | undefined): string | null {
  if (!init || !init.body) return null;
  if (typeof init.body === "string") return init.body;
  if (init.body instanceof FormData) return `[FormData: ${Array.from(init.body.entries()).map(([k]) => k).join(", ")}]`;
  if (init.body instanceof URLSearchParams) return init.body.toString();
  try {
    return String(init.body);
  } catch {
    return "[unreadable body]";
  }
}

function extractHeaders(headers: HeadersInit | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!headers) return out;
  if (headers instanceof Headers) {
    headers.forEach((v, k) => { out[k] = v; });
  } else if (Array.isArray(headers)) {
    for (const [k, v] of headers) out[k] = String(v);
  } else {
    Object.assign(out, headers);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/*  Core hook: patches window.fetch                                    */
/* ------------------------------------------------------------------ */

function install() {
  if (active) return;
  if (typeof window === "undefined") return;
  if (originalFetch) return;

  originalFetch = window.fetch.bind(window);

  window.fetch = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const start = performance.now();
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    const method = (init?.method || (typeof input !== "string" && !(input instanceof URL) ? input.method : undefined) || "GET").toUpperCase();

    // Only instrument API calls
    if (!isApiUrl(url)) {
      return originalFetch!(input, init);
    }

    const requestHeaders = extractHeaders(init?.headers);
    const requestBody = readBody(init);
    const hasAuthHeader = !!requestHeaders["authorization"] || !!requestHeaders["Authorization"];

    seq++;
    const thisSeq = seq;

    try {
      const response = await originalFetch!(input, init);

      const durationMs = performance.now() - start;

      // Clone the response so we can read the body without consuming it
      const clone = response.clone();
      let responseBody = "";
      const ct = response.headers.get("content-type") || "";

      try {
        if (ct.includes("json")) {
          const json = await clone.json();
          responseBody = truncate(JSON.stringify(json));
        } else if (ct.includes("text") || ct.includes("html")) {
          responseBody = truncate(await clone.text());
        } else {
          responseBody = `[binary: ${ct}]`;
        }
      } catch {
        responseBody = "[unreadable body]";
      }

      const entry: DebugEntry = {
        seq: thisSeq,
        url,
        method,
        requestHeaders,
        requestBody: requestBody ? truncate(requestBody, 500) : null,
        responseStatus: response.status,
        responseStatusText: response.statusText,
        responseContentType: ct,
        responseBody,
        workspaceId: lazyAuth.userId, // will be enriched by caller
        userId: lazyAuth.userId,
        clerkSessionId: lazyAuth.sessionId,
        hasAuthHeader,
        timestamp: Date.now(),
        durationMs: Math.round(durationMs),
      };

      // Lazy-load auth state
      try {
        const { useAuth } = await import("@clerk/nextjs");
        // Can't call hooks outside React – fallback to cookie reading
      } catch {
        // noop
      }

      // Try reading Clerk session from cookies as a fallback
      entry.clerkSessionId = readCookies() || null;

      // Read workspace ID from DOM / localStorage
      try {
        entry.workspaceId = localStorage.getItem("activeWorkspaceId");
      } catch {
        // noop
      }

      entries.push(entry);
      if (entries.length > MAX_ENTRIES) entries.shift();

      // Print to console in a structured format for easy comparison
      const icon = response.ok ? "✓" : "✗";
      console.groupCollapsed(
        `%c[API-DEBUG] %c#${thisSeq} %c${icon} %c${method} %c${response.status} %c${url.split("?")[0].split("/").pop() || url}`,
        "color:#888;font-weight:normal",
        "color:#f0f;font-weight:bold",
        response.ok ? "color:#0c0" : "color:#c00",
        "color:#88f;font-weight:bold",
        response.ok ? "color:#0c0" : "color:#c00",
        "color:#888"
      );
      console.log("URL:", url);
      console.log("Method:", method);
      console.log("Status:", response.status, response.statusText);
      console.log("Content-Type:", ct);
      console.log("Response:", responseBody);
      console.log("Request Headers:", requestHeaders);
      console.log("Request Body:", requestBody);
      console.log("Workspace ID:", entry.workspaceId);
      console.log("Clerk Session (cookies):", entry.clerkSessionId);
      console.log("Has Auth Header:", hasAuthHeader);
      console.log("Duration:", `${durationMs.toFixed(0)}ms`);

      // On failure, dump recent history for comparison
      if (!response.ok && isMutationMethod(method) && entries.length >= 2) {
        console.warn("=== FAILED MUTATION ===");
        console.warn("Compare with the LAST successful mutation below:");
        const lastOk = [...entries].reverse().find(e => e.seq !== thisSeq && e.responseStatus < 400);
        if (lastOk) {
          console.warn("LAST SUCCESS (#" + lastOk.seq + "):", {
            url: lastOk.url,
            method: lastOk.method,
            status: lastOk.responseStatus,
            workspaceId: lastOk.workspaceId,
            clerkSession: lastOk.clerkSessionId,
            hasAuthHeader: lastOk.hasAuthHeader,
          });
        }
        console.warn("THIS FAILURE (#" + thisSeq + "):", {
          url: entry.url,
          method: entry.method,
          status: entry.responseStatus,
          workspaceId: entry.workspaceId,
          clerkSession: entry.clerkSessionId,
          hasAuthHeader: entry.hasAuthHeader,
          responseBody: entry.responseBody,
        });

        // Highlight differences
        const diffs: string[] = [];
        if (lastOk) {
          if (lastOk.workspaceId !== entry.workspaceId) diffs.push(`workspaceId: ${lastOk.workspaceId} → ${entry.workspaceId}`);
          if (lastOk.clerkSessionId !== entry.clerkSessionId) diffs.push(`clerkSession: changed`);
          if (lastOk.hasAuthHeader !== entry.hasAuthHeader) diffs.push(`authHeader: ${lastOk.hasAuthHeader} → ${entry.hasAuthHeader}`);
          if (lastOk.url !== entry.url) diffs.push(`url: ${lastOk.url} → ${entry.url}`);
        }
        if (diffs.length > 0) {
          console.error("=== KEY DIFFERENCES DETECTED ===");
          diffs.forEach(d => console.error("  DIFF:", d));
        } else {
          console.warn("No obvious differences in logged fields — check network panel for cookie/auth differences");
        }
      }

      console.groupEnd();

      return response;
    } catch (error) {
      console.error(`[API-DEBUG] #${thisSeq} FETCH ERROR:`, {
        url,
        method,
        requestBody,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  };

  active = true;
  console.log("[API-DEBUG] Installed. Open DevTools → Console → filter by 'API-DEBUG' to see instrumented requests.");

  // Print table of all entries on demand
  (window as any).__apiDebug = {
    entries: () => [...entries],
    table: () => console.table(entries.map(e => ({
      seq: e.seq,
      method: e.method,
      url: e.url.split("?")[0].split("/").pop(),
      status: e.responseStatus,
      workspaceId: e.workspaceId,
      duration: `${e.durationMs}ms`,
      ok: e.responseStatus < 400,
    }))),
    clear: () => { entries.length = 0; seq = 0; },
  };
}

function isEnabled(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return (
      new URL(window.location.href).searchParams.has("api-debug") ||
      sessionStorage.getItem("api-debug") === "1"
    );
  } catch {
    return false;
  }
}

/* ------------------------------------------------------------------ */
/*  Auto-install on page load (only with ?api-debug trigger)          */
/* ------------------------------------------------------------------ */

if (typeof window !== "undefined") {
  if (isEnabled()) {
    install();
  }

  // Listen for sessionStorage changes to enable/disable at runtime
  window.addEventListener("storage", (e) => {
    if (e.key === "api-debug" && e.newValue === "1" && !active) install();
  });
}

/* ------------------------------------------------------------------ */
/*  Manual toggle for console use                                      */
/* ------------------------------------------------------------------ */

export function enableApiDebug() {
  try { sessionStorage.setItem("api-debug", "1"); } catch {}
  install();
}

export function disableApiDebug() {
  try { sessionStorage.removeItem("api-debug", "1"); } catch {}
  if (originalFetch) {
    window.fetch = originalFetch;
    originalFetch = null;
    active = false;
  }
}

export function getEntries(): DebugEntry[] {
  return [...entries];
}
