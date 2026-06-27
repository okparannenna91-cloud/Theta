"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

async function fetchWorkspaces() {
  const res = await fetch("/api/workspaces");
  if (!res.ok) throw new Error("Failed to fetch workspaces");
  return res.json();
}

export function useWorkspace() {
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("activeWorkspaceId");
    }
    return null;
  });

  const { data: workspaces, isLoading, error } = useQuery({
    queryKey: ["workspaces"],
    queryFn: fetchWorkspaces,
    staleTime: 0,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
  });

  const [fallbackWorkspace, setFallbackWorkspace] = useState<any>(null);
  const [fallbackLoading, setFallbackLoading] = useState(false);

  // Sync active workspace from localStorage only when we have valid list data
  const queryCompleted = !isLoading && workspaces !== undefined;
  useEffect(() => {
    if (!queryCompleted) return;

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
  }, [workspaces, activeWorkspaceId, queryCompleted]);

  // Fallback: fetch single workspace when list is empty but we have an active ID
  const shouldFallback = queryCompleted && (!workspaces || workspaces.length === 0) && activeWorkspaceId && !fallbackWorkspace;
  useEffect(() => {
    if (!shouldFallback) return;

    setFallbackLoading(true);
    fetch(`/api/workspaces/${activeWorkspaceId}`)
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        if (data) setFallbackWorkspace(data);
      })
      .catch(() => {})
      .finally(() => setFallbackLoading(false));
  }, [shouldFallback]);

  // Clear fallback when the main list query returns valid data
  useEffect(() => {
    if (workspaces && workspaces.length > 0 && fallbackWorkspace) {
      setFallbackWorkspace(null);
    }
  }, [workspaces, fallbackWorkspace]);

  const switchWorkspace = (id: string) => {
    if (!id || typeof id !== "string") return;
    setActiveWorkspaceId(id);
    localStorage.setItem("activeWorkspaceId", id);
  };

  const activeWorkspace = workspaces?.find((w: any) => w.id === activeWorkspaceId) || fallbackWorkspace || workspaces?.[0] || null;

  return {
    workspaces: workspaces && workspaces.length > 0 ? workspaces : (fallbackWorkspace ? [fallbackWorkspace] : workspaces),
    activeWorkspace,
    activeWorkspaceId: activeWorkspaceId || activeWorkspace?.id || null,
    isLoading: (isLoading && !workspaces) || fallbackLoading,
    error,
    switchWorkspace,
  };
}
