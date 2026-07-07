"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, useCallback } from "react";

const WORKSPACE_SWITCH_EVENT = "workspace:switch";

async function fetchWorkspaces() {
  const res = await fetch("/api/workspaces");
  if (!res.ok) throw new Error("Failed to fetch workspaces");
  return res.json();
}

function getInitialWorkspaceId(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem("activeWorkspaceId");
  }
  return null;
}

export function useWorkspace() {
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(getInitialWorkspaceId);

  const { data: workspaces, isLoading, isSuccess, error } = useQuery({
    queryKey: ["workspaces"],
    queryFn: fetchWorkspaces,
    staleTime: 300000, // 5 min – workspace list rarely changes
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const [fallbackWorkspace, setFallbackWorkspace] = useState<any>(null);
  const [fallbackLoading, setFallbackLoading] = useState(false);
  const [fallbackError, setFallbackError] = useState<Error | null>(null);

  // Listen for workspace switch events from other hook instances
  useEffect(() => {
    const handler = (e: CustomEvent) => {
      if (e.detail?.id) {
        setActiveWorkspaceId(e.detail.id);
      }
    };
    window.addEventListener(WORKSPACE_SWITCH_EVENT, handler as EventListener);
    return () => window.removeEventListener(WORKSPACE_SWITCH_EVENT, handler as EventListener);
  }, []);

  // Sync active workspace from localStorage only when we have valid list data
  useEffect(() => {
    if (!isSuccess) return;

    if (workspaces && workspaces.length > 0) {
      const savedId = localStorage.getItem("activeWorkspaceId");
      const isValidSavedId = workspaces.find((w: any) => w.id === savedId);

      if (savedId && isValidSavedId) {
        if (activeWorkspaceId !== savedId) setActiveWorkspaceId(savedId);
      } else if (!activeWorkspaceId) {
        const firstId = workspaces[0].id;
        setActiveWorkspaceId(firstId);
        localStorage.setItem("activeWorkspaceId", firstId);
      }
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
  }, [shouldFallback]);

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

  return {
    workspaces: workspaces && workspaces.length > 0 ? workspaces : (fallbackWorkspace ? [fallbackWorkspace] : workspaces),
    activeWorkspace,
    activeWorkspaceId: activeWorkspaceId || activeWorkspace?.id || null,
    isLoading: (isLoading && !workspaces) || fallbackLoading,
    error: error || fallbackError,
    switchWorkspace,
  };
}
