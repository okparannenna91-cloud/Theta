"use client";

type ApiClientOptions = Omit<RequestInit, "body"> & {
  body?: any;
  params?: Record<string, string | number | boolean | undefined | null>;
};

const SESSION_EXPIRED_CODES = ["auth/session-expired", "auth/unauthorized"];

let isRedirecting = false;

function getSignInUrl(): string {
  const path = window.location.pathname + window.location.search;
  return `/sign-in?redirect_url=${encodeURIComponent(path)}`;
}

function handleSessionExpired(): void {
  if (isRedirecting) return;
  isRedirecting = true;

  import("sonner").then(({ toast }) => {
    toast.error("Your session has expired. Please sign in again.", {
      duration: 5000,
      id: "session-expired",
    });
  });

  const redirectUrl = getSignInUrl();
  window.location.href = redirectUrl;
}

export async function apiClient<T = any>(
  url: string,
  options: ApiClientOptions = {}
): Promise<T> {
  const { params, ...fetchOptions } = options;

  let resolvedUrl = url;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value != null) {
        searchParams.set(key, String(value));
      }
    }
    const qs = searchParams.toString();
    if (qs) {
      resolvedUrl += (resolvedUrl.includes("?") ? "&" : "?") + qs;
    }
  }

  const headers: Record<string, string> = {
    ...(fetchOptions.headers as Record<string, string>),
  };
  if (
    fetchOptions.body &&
    typeof fetchOptions.body === "object" &&
    !(fetchOptions.body instanceof FormData) &&
    !(fetchOptions.body instanceof URLSearchParams)
  ) {
    headers["Content-Type"] = "application/json";
  }

  const response = await fetch(resolvedUrl, {
    ...fetchOptions,
    headers,
    body:
      fetchOptions.body && typeof fetchOptions.body === "object" &&
      !(fetchOptions.body instanceof FormData) &&
      !(fetchOptions.body instanceof URLSearchParams)
        ? JSON.stringify(fetchOptions.body)
        : (fetchOptions.body as BodyInit | undefined),
  });

  if (response.status === 401) {
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("json")) {
      const errorBody = await response.json().catch(() => ({}));
      if (
        errorBody?.code &&
        SESSION_EXPIRED_CODES.includes(errorBody.code)
      ) {
        handleSessionExpired();
        throw new Error(errorBody.error || "Session expired");
      }
    }
    handleSessionExpired();
    throw new Error("Unauthorized");
  }

  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("json")) {
    return response.json();
  }

  return (await response.text()) as unknown as T;
}
