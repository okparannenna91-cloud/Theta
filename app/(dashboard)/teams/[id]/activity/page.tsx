"use client";

import { useQuery } from "@tanstack/react-query";
import { useTeam } from "@/components/teams/team-context";
import { useWorkspace } from "@/hooks/use-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Image from "next/image";

export default function TeamActivityPage() {
  const team = useTeam();
  const { activeWorkspaceId } = useWorkspace();

  const { data: activities, isLoading } = useQuery({
    queryKey: ["team-activity", team.id],
    queryFn: async () => {
      const res = await fetch(`/api/activity?workspaceId=${activeWorkspaceId}&entityId=${team.id}&entityType=team`);
      if (!res.ok) throw new Error("Failed to fetch activity");
      const data = await res.json();
      return data.activities || [];
    },
  });

  if (isLoading) {
    return <div className="p-6 space-y-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>;
  }

  return (
    <div className="p-6 max-w-3xl space-y-3">
      <h3 className="text-xs font-medium text-muted-foreground/50 uppercase tracking-wider mb-4">Activity Feed</h3>
      {activities?.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/30">
          <Activity className="h-10 w-10 mb-3" />
          <p className="text-sm">No activity yet</p>
        </div>
      )}
      <div className="space-y-1">
        {activities?.map((a: any) => (
          <div key={a.id} className="flex items-start gap-3 p-3 rounded-xl hover:bg-muted/30 transition-colors">
            <div className="h-8 w-8 rounded-full bg-muted border flex items-center justify-center shrink-0 mt-0.5">
              {a.user?.imageUrl ? (
                <Image src={a.user.imageUrl} alt="" width={32} height={32} className="h-full w-full object-cover rounded-full" />
              ) : (
                <Activity className="h-4 w-4 text-muted-foreground" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm">
                <span className="font-medium">{a.user?.name || "User"}</span>
                {" "}<span className="capitalize text-muted-foreground">{a.action}</span>
                {" "}{a.entityType?.replace(/_/g, " ")}
              </p>
              <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
                <Clock className="h-3 w-3" />
                {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
