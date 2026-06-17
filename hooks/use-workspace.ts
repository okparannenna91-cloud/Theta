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

  useEffect(() => {
    if (workspaces && workspaces.length > 0) {
      const savedId = localStorage.getItem("activeWorkspaceId");
      const isValidSavedId = workspaces.find((w: any) => w.id === savedId);
      
      if (savedId && isValidSavedId) {
        if (activeWorkspaceId !== savedId) setActiveWorkspaceId(savedId);
      } else {
        const firstWorkspaceId = workspaces[0].id;
        if (!activeWorkspaceId) {
            setActiveWorkspaceId(firstWorkspaceId);
            localStorage.setItem("activeWorkspaceId", firstWorkspaceId);
        }
      }
    }
  }, [workspaces, activeWorkspaceId]);

  useEffect(() => {
    if ((!workspaces || workspaces.length === 0) && activeWorkspaceId && !fallbackWorkspace) {
      setFallbackLoading(true);
      fetch(`/api/workspaces/${activeWorkspaceId}`)
        .then((res) => res.ok ? res.json() : null)
        .then((data) => {
          if (data) setFallbackWorkspace(data);
        })
        .catch(() => {})
        .finally(() => setFallbackLoading(false));
    }
  }, [workspaces, activeWorkspaceId, fallbackWorkspace]);

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
