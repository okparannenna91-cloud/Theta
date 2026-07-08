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
};

const WorkspaceContext = createContext<WorkspaceContextType | null>(null);

async function fetchWorkspaces() {
  const res = await fetch("/api/workspaces");
  if (!res.ok) throw new Error("Failed to fetch workspaces");
  return res.json();
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
    refetchOnWindowFocus: true,
  });

  const [fallbackWorkspace, setFallbackWorkspace] = useState<any>(null);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [fallbackError, setFallbackError] = useState<Error | null>(null);

  // Reset workspace on user change
  useEffect(() => {
    if (!isAuthLoaded) return;
    if (prevUserId.current !== undefined && prevUserId.current !== userId) {
      setActiveWorkspaceId(null);
      localStorage.removeItem("activeWorkspaceId");
      // Invalidate all workspace-dependent queries on user change
      queryClient.invalidateQueries();
    }
    prevUserId.current = userId;
  }, [userId, isAuthLoaded, queryClient]);

  // Sync active workspace from localStorage + validate against server data
  useEffect(() => {
    if (!isSuccess || !workspaces || workspaces.length === 0) return;

    const savedId = localStorage.getItem("activeWorkspaceId");
    const isValidSavedId = workspaces.find((w: any) => w.id === savedId);

    if (savedId && isValidSavedId) {
      if (activeWorkspaceId !== savedId) setActiveWorkspaceId(savedId);
    } else if (!activeWorkspaceId) {
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
    fetch(`/api/workspaces/${activeWorkspaceId}`, { signal: controller.signal })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to fetch workspace");
        return res.json();
      })
      .then((data) => {
        if (data) setFallbackWorkspace(data);
      })
      .catch((err) => {
        if (err.name !== "AbortError") setFallbackError(err);
      })
      .finally(() => setFallbackLoading(false));
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
