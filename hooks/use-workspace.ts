"use client";

import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";

async function fetchWorkspaces() {
  const res = await fetch("/api/workspaces");
  if (!res.ok) throw new Error("Failed to fetch workspaces");
  return res.json();
}

export function useWorkspace() {
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);

  const { data: workspaces, isLoading, error } = useQuery({
    queryKey: ["workspaces"],
    queryFn: fetchWorkspaces,
  });

  useEffect(() => {
    if (workspaces && workspaces.length > 0) {
      const savedId = localStorage.getItem("activeWorkspaceId");
      const isValidSavedId = workspaces.find((w: any) => w.id === savedId);
      
      if (savedId && isValidSavedId) {
        setActiveWorkspaceId(savedId);
      } else {
        setActiveWorkspaceId(workspaces[0].id);
        localStorage.setItem("activeWorkspaceId", workspaces[0].id);
      }
    }
  }, [workspaces]);

  const switchWorkspace = (id: string) => {
    setActiveWorkspaceId(id);
    localStorage.setItem("activeWorkspaceId", id);
  };

  const activeWorkspace = workspaces?.find((w: any) => w.id === activeWorkspaceId) || workspaces?.[0] || null;

  return {
    workspaces,
    activeWorkspace,
    activeWorkspaceId: activeWorkspace?.id || null,
    isLoading,
    error,
    switchWorkspace,
  };
}
