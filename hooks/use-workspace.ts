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
  });

  useEffect(() => {
    if (workspaces && workspaces.length > 0) {
      const savedId = localStorage.getItem("activeWorkspaceId");
      const isValidSavedId = workspaces.find((w: any) => w.id === savedId);
      
      if (savedId && isValidSavedId) {
        if (activeWorkspaceId !== savedId) setActiveWorkspaceId(savedId);
      } else {
        // If we have a project ID in the URL but no workspace, we'll try to find it
        // For now, default to the first one but don't force it if the project search is ongoing
        const firstWorkspaceId = workspaces[0].id;
        if (!activeWorkspaceId) {
            setActiveWorkspaceId(firstWorkspaceId);
            localStorage.setItem("activeWorkspaceId", firstWorkspaceId);
        }
      }
    }
  }, [workspaces, activeWorkspaceId]);

  const switchWorkspace = (id: string) => {
    setActiveWorkspaceId(id);
    localStorage.setItem("activeWorkspaceId", id);
    window.location.reload();
  };

  const activeWorkspace = workspaces?.find((w: any) => w.id === activeWorkspaceId) || workspaces?.[0] || null;

  return {
    workspaces,
    activeWorkspace,
    activeWorkspaceId: activeWorkspaceId || activeWorkspace?.id || null,
    isLoading: isLoading && !workspaces, // Only true on first load with no data
    error,
    switchWorkspace,
  };
}
