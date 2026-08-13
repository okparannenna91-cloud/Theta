"use client";

import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProjectHeader } from "@/components/projects/project-header";

export default function ProjectLayout({ children, params }: { children: React.ReactNode; params: { id: string } }) {
  const { activeWorkspaceId } = useWorkspace();

  const { data: project, isLoading } = useQuery({
    queryKey: ["project", params.id, activeWorkspaceId],
    queryFn: async () => {
      const url = activeWorkspaceId ? `/api/projects/${params.id}?workspaceId=${activeWorkspaceId}` : `/api/projects/${params.id}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to fetch project");
      return res.json();
    },
    enabled: !!params.id,
  });

  if (isLoading) {
    return (
      <div className="h-full flex flex-col">
        <div className="px-8 lg:px-10 py-3.5 border-b border-border/20">
          <div className="flex items-center gap-2.5">
            <Skeleton className="h-7 w-7 rounded-lg" />
            <Skeleton className="h-4 w-40" />
          </div>
        </div>
        <div className="flex-1 px-8 lg:px-10 py-6">
          <Skeleton className="h-[60vh] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Card className="max-w-md border-border/20 shadow-sm rounded-2xl">
          <CardHeader className="text-center">
            <CardTitle className="text-base">Project not found</CardTitle>
            <CardDescription>The project you&apos;re looking for doesn&apos;t exist or has been deleted.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center pb-6">
            <Link href="/projects"><Button variant="outline">Back to Projects</Button></Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <ProjectHeader project={project} />

      <div className="flex-1 pt-3 overflow-y-auto">
        {children}
      </div>
    </div>
  );
}
