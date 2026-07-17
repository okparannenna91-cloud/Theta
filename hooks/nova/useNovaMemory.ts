"use client";

import { useState, useCallback } from "react";
import { toast } from "sonner";

export function useNovaMemory(workspaceId: string | undefined) {
  const [memories, setMemories] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchMemories = useCallback(async () => {
    if (!workspaceId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/ai/memory?workspaceId=${workspaceId}`);
      if (res.ok) {
        const data = await res.json();
        setMemories(Array.isArray(data) ? data : []);
      }
    } catch (error) {
      console.error("Failed to fetch memories:", error);
    } finally {
      setLoading(false);
    }
  }, [workspaceId]);

  const deleteMemory = useCallback(
    async (id: string) => {
      try {
        const res = await fetch("/api/ai/memory", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ workspaceId, id }),
        });
        if (res.ok) {
          setMemories((prev) => prev.filter((m: any) => m.id !== id));
          toast.success("Memory deleted");
        }
      } catch (error) {
        console.error("Failed to delete memory:", error);
      }
    },
    [workspaceId]
  );

  return { memories, loading, fetchMemories, deleteMemory };
}
