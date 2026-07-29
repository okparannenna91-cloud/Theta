"use client";

import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { TeamSidebar } from "@/components/teams/team-sidebar";
import { TeamProvider } from "@/components/teams/team-context";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function TeamLayout({ children, params }: { children: React.ReactNode; params: { id: string } }) {
  const { activeWorkspaceId } = useWorkspace();

  const { data: team, isLoading } = useQuery({
    queryKey: ["team", params.id, activeWorkspaceId],
    queryFn: async () => {
      const url = activeWorkspaceId ? `/api/teams/${params.id}?workspaceId=${activeWorkspaceId}` : `/api/teams/${params.id}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch team");
      return res.json();
    },
    enabled: !!params.id,
  });

  if (isLoading) {
    return (
      <div className="h-full flex">
        <div className="w-[260px] border-r border-border/20 p-4 space-y-3">
          <Skeleton className="h-4 w-20" />
          <div className="flex items-center gap-3">
            <Skeleton className="h-9 w-9 rounded-[10px]" />
            <div className="space-y-1.5">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-3 w-16" />
            </div>
          </div>
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-8 w-full rounded-[8px]" />
          ))}
        </div>
        <div className="flex-1 p-6">
          <Skeleton className="h-full w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!team) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md border-border/20 shadow-sm rounded-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-base">Team not found</CardTitle>
            <CardDescription>The team you&apos;re looking for doesn&apos;t exist or has been deleted.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Link href="/teams"><Button variant="outline">Back to Teams</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <TeamProvider team={team}>
      <div className="h-full flex">
        <TeamSidebar team={team} />
        <div className="flex-1 min-w-0 overflow-y-auto">
          {children}
        </div>
      </div>
    </TeamProvider>
  );
}
