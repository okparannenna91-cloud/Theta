"use client";

import { useQuery } from "@tanstack/react-query";
import { useTeam } from "@/components/teams/team-context";
import { useWorkspace } from "@/hooks/use-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Shield } from "lucide-react";

export default function TeamBoardsPage() {
  const team = useTeam();
  const { activeWorkspaceId } = useWorkspace();

  const { data: boards, isLoading } = useQuery({
    queryKey: ["team-boards", team.id],
    queryFn: async () => {
      const res = await fetch(`/api/boards?workspaceId=${activeWorkspaceId}&teamId=${team.id}`);
      if (!res.ok) throw new Error("Failed to fetch boards");
      return res.json();
    },
  });

  if (isLoading) {
    return <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}</div>;
  }

  return (
    <div className="p-6 max-w-4xl space-y-4">
      {(!boards || boards.length === 0) && (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground/30">
          <Shield className="h-10 w-10 mb-3" />
          <p className="text-sm">No boards in this team</p>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {boards?.map((b: any) => (
          <Card key={b.id} className="rounded-2xl border-border/20">
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-[10px] bg-amber-500/10 flex items-center justify-center text-xs font-semibold text-amber-600 shrink-0">
                  {b.name?.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{b.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{b.description || "No description"}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
