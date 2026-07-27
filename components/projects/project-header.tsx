"use client";

import Link from "next/link";
import { ArrowLeft, Star, MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ProjectHeaderProps {
  project: {
    name: string;
    visibility?: string;
    status?: string;
    createdAt: string;
  };
}

export function ProjectHeader({ project }: ProjectHeaderProps) {
  const visibilityLabel = project.visibility === "private" ? "Private"
    : project.visibility === "team_access" ? "Team"
    : "Workspace";

  return (
    <div className="sticky top-0 z-40 glass-deep">
      <div className="px-8 lg:px-10 py-3.5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <Link href="/projects">
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-accent/30 transition-all"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
              </Button>
            </Link>

            <div className="flex items-center gap-2 min-w-0">
              <h1 className="text-sm font-semibold tracking-tight text-foreground truncate">
                {project.name}
              </h1>
              <Badge variant="outline" className={cn(
                "text-[8px] font-medium rounded-full px-1.5 py-0 h-4 shrink-0 border tracking-wider uppercase",
                project.visibility === "private"
                  ? "bg-amber-500/8 text-amber-600 dark:text-amber-400 border-amber-200/40 dark:border-amber-800/30"
                  : "bg-emerald-500/8 text-emerald-600 dark:text-emerald-400 border-emerald-200/40 dark:border-emerald-800/30"
              )}>
                {visibilityLabel}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-accent/30 transition-all">
              <Star className="h-3.5 w-3.5" />
            </Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-accent/30 transition-all">
              <MoreHorizontal className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2 mt-0.5 ml-[30px]">
          <span className="text-[10px] text-muted-foreground/35 font-medium">
            Created {new Date(project.createdAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric"
            })}
          </span>
          <span className="h-0.5 w-0.5 rounded-full bg-muted-foreground/10" />
          <span className="text-[10px] text-muted-foreground/35 font-medium capitalize">{project.status || "Active"}</span>
        </div>
      </div>
    </div>
  );
}
