"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@clerk/nextjs";

const WORKSPACE_SWITCH_EVENT = "workspace:switch";

type WorkspaceContextType = {
  workspaces: any[];
  activeWorkspace: any;
  activeWorkspaceId: string | null;
  isLoading: boolean;
  error: Error | null;
  switchWorkspace: (id: string) => void;
  clearActiveWorkspace: () => void;
};

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

async function fetchWorkspaces() {
  const res = await fetch("/api/workspaces");
  if (!res.ok) throw new Error("Failed to fetch workspaces");
  return res.json();
}

async function fetchWithRetry(url: string, attempts = 3, baseDelay = 2000) {
  let lastError: Error | null = null;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch workspace");
      return await res.json();
    } catch (err) {
      lastError = err as Error;
      if (i < attempts - 1) {
        await new Promise((r) => setTimeout(r, baseDelay * (i + 1)));
      }
    }
  }
  throw lastError;
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { userId, isLoaded: isAuthLoaded } = useAuth();
  const queryClient = useQueryClient();
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("activeWorkspaceId");
    }
    return null;
  });
  const prevUserId = useRef<string | null | undefined>(undefined);

  const { data: workspaces, isLoading, isSuccess, error } = useQuery({
    queryKey: ["workspaces", userId],
    queryFn: fetchWorkspaces,
    enabled: !!userId,
    staleTime: 30 * 1000,
    refetchOnMount: true,
    // Vercel cold starts can take 10-30s (Mongo connection + cache init), which
    // outlasts the default retry window. Back off harder so the very first load
    // after onboarding/invite acceptance survives instead of erroring out.
    retry: 5,
    retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 15_000),
  });

  const [fallbackWorkspace, setFallbackWorkspace] = useState<any>(null);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [fallbackError, setFallbackError] = useState<Error | null>(null);

  // Reset workspace on user change
  useEffect(() => {
    if (!isAuthLoaded) return;
    if (prevUserId.current !== undefined && prevUserId.current !== userId) {
      // Only reset if userId transitioned from one defined value to another
      // (ignores transient null/undefined flickers during session refresh)
      if (prevUserId.current && userId) {
        setActiveWorkspaceId(null);
        localStorage.removeItem("activeWorkspaceId");
        // Invalidate only workspace-dependent queries (not the entire cache)
        queryClient.invalidateQueries({ queryKey: ["workspaces"] });
        queryClient.invalidateQueries({ queryKey: ["subscription"] });
      }
    }
    prevUserId.current = userId;
  }, [userId, isAuthLoaded, queryClient]);

  // Sync active workspace from localStorage + validate against server data
  useEffect(() => {
    if (!isSuccess || !workspaces || workspaces.length === 0) return;

    const savedId = localStorage.getItem("activeWorkspaceId");
    const isValidSavedId = workspaces.find((w: any) => w.id === savedId);

    if (isValidSavedId) {
      if (activeWorkspaceId !== savedId) setActiveWorkspaceId(savedId);
    } else {
      // Saved id is missing OR stale (e.g. leftover from a previous account on
      // the same browser). Always fall back to the first workspace — keeping
      // the invalid id makes every page query a workspace the user doesn't
      // belong to (403 / "Failed to load dashboard").
      const firstId = workspaces[0].id;
      setActiveWorkspaceId(firstId);
      localStorage.setItem("activeWorkspaceId", firstId);
    }
  }, [workspaces, activeWorkspaceId, isSuccess]);

  // Fallback: fetch single workspace when list is empty but we have an active ID
  const shouldFallback = isSuccess && (!workspaces || workspaces.length === 0) && activeWorkspaceId && !fallbackWorkspace && !fallbackError;
  useEffect(() => {
    if (!shouldFallback) return;
    const controller = new AbortController();
    setFallbackLoading(true);
    setFallbackError(null);
    fetchWithRetry(`/api/workspaces/${activeWorkspaceId}`, 3, 2000)
      .then((data) => {
        if (data && !controller.signal.aborted) setFallbackWorkspace(data);
      })
      .catch((err) => {
        if (!controller.signal.aborted) setFallbackError(err);
      })
      .finally(() => {
        if (!controller.signal.aborted) setFallbackLoading(false);
      });
    return () => controller.abort();
  }, [shouldFallback, activeWorkspaceId]);

  // Clear fallback when the main list query returns valid data
  useEffect(() => {
    if (workspaces && workspaces.length > 0 && fallbackWorkspace) {
      setFallbackWorkspace(null);
    }
  }, [workspaces, fallbackWorkspace]);

  const switchWorkspace = useCallback((id: string) => {
    if (!id || typeof id !== "string") return;
    setActiveWorkspaceId(id);
    localStorage.setItem("activeWorkspaceId", id);
    window.dispatchEvent(new CustomEvent(WORKSPACE_SWITCH_EVENT, { detail: { id } }));
  }, []);

  const clearActiveWorkspace = useCallback(() => {
    setActiveWorkspaceId(null);
    setFallbackWorkspace(null);
    setFallbackError(null);
    localStorage.removeItem("activeWorkspaceId");
  }, []);

  const activeWorkspace = workspaces?.find((w: any) => w.id === activeWorkspaceId) || fallbackWorkspace || workspaces?.[0] || null;

  return (
    <WorkspaceContext.Provider
      value={{
        workspaces: workspaces && workspaces.length > 0 ? workspaces : (fallbackWorkspace ? [fallbackWorkspace] : workspaces),
        activeWorkspace,
        activeWorkspaceId: activeWorkspaceId || activeWorkspace?.id || null,
        isLoading: (isLoading && !workspaces) || fallbackLoading,
        error: error || fallbackError,
        switchWorkspace,
        clearActiveWorkspace,
      }}
    >
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error("useWorkspace must be used within <WorkspaceProvider>");
  }
  return ctx;
}
