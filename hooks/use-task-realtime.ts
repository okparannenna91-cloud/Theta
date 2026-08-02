"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAblyContext } from "@/components/providers/ably-provider";
import { useUser } from "@clerk/nextjs";

/**
 * Live task sync for task-list views (timeline, gantt, calendar, ...).
 *
 * Subscribes to the workspace Ably channel and upserts task:created / task:updated /
 * task:deleted messages straight into every React Query cache whose key starts with
 * [baseKey, workspaceId]. This keeps timeline bars, parent durations, progress and
 * dependency data instantly in sync across users without refetching.
 */
export function useTaskRealtime(workspaceId: string | null, baseKey: string) {
  const queryClient = useQueryClient();
  const ablyClient = useAblyContext();
  const { user } = useUser();

  useEffect(() => {
    if (!user || !ablyClient || !workspaceId) return;

    const channel = ablyClient.channels.get(`workspace:${workspaceId}`);
    const prefix = [baseKey, workspaceId];

    const upsert = (task: any) => {
      if (!task?.id) return;
      queryClient.setQueriesData({ queryKey: prefix }, (old: any) => {
        if (!Array.isArray(old)) return old;
        const idx = old.findIndex((t: any) => t?.id === task.id);
        if (idx === -1) return [task, ...old];
        const next = [...old];
        next[idx] = { ...next[idx], ...task };
        return next;
      });
    };

    const remove = (msg: any) => {
      const id = msg?.id;
      if (!id) return;
      queryClient.setQueriesData({ queryKey: prefix }, (old: any) => {
        if (!Array.isArray(old)) return old;
        return old.filter((t: any) => t?.id !== id);
      });
    };

    const listener = (message: any) => {
      if (message.name === "task:created" || message.name === "task:updated") {
        upsert(message.data);
      } else if (message.name === "task:deleted") {
        remove(message.data);
      }
    };

    channel.subscribe(["task:created", "task:updated", "task:deleted"], listener);
    return () => {
      channel.unsubscribe(["task:created", "task:updated", "task:deleted"], listener);
    };
  }, [user, ablyClient, workspaceId, baseKey, queryClient]);
}
