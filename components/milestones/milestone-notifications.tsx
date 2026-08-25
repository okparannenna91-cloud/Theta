"use client";

import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { Milestone, AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import { format, parseISO, isPast, isToday, differenceInDays } from "date-fns";

interface MilestoneNotification {
  id: string;
  title: string;
  dueDate: string;
  status: string;
  color: string;
  project?: { name: string };
}

export function MilestoneNotifications() {
  const { activeWorkspaceId } = useWorkspace();

  const { data: milestones } = useQuery({
    queryKey: ["milestones-notifications", activeWorkspaceId],
    queryFn: async () => {
      if (!activeWorkspaceId) return [];
      const res = await fetch(`/api/milestones?workspaceId=${activeWorkspaceId}&status=active`);
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!activeWorkspaceId,
    refetchInterval: 300000,
  });

  const milestoneList = Array.isArray(milestones) ? milestones : [];

  const notifications = milestoneList.reduce((acc: { type: string; milestone: MilestoneNotification }[], milestone: MilestoneNotification) => {
    const dueDate = parseISO(milestone.dueDate);
    const now = new Date();
    const daysUntilDue = differenceInDays(dueDate, now);

    if (isPast(dueDate) && !isToday(dueDate)) {
      acc.push({ type: "overdue", milestone });
    } else if (daysUntilDue <= 3 && daysUntilDue >= 0) {
      acc.push({ type: "due_soon", milestone });
    }

    return acc;
  }, []);

  if (notifications.length === 0) return null;

  return (
    <div className="space-y-2">
      {notifications.map(({ type, milestone }: { type: string; milestone: MilestoneNotification }) => (
        <div
          key={milestone.id}
          className={cn(
            "flex items-center gap-3 p-3 rounded-lg border text-xs",
            type === "overdue" && "bg-amber-500/5 border-amber-500/30",
            type === "due_soon" && "bg-blue-500/5 border-blue-500/30"
          )}
        >
          <div className={cn(
            "w-2 h-2 rounded-full flex-shrink-0",
            type === "overdue" ? "bg-amber-500" : "bg-blue-500"
          )} />
          <div className="flex-1 min-w-0">
            <p className="font-medium truncate">{milestone.title}</p>
            <p className="text-muted-foreground">
              {type === "overdue" ? "Overdue" : "Due soon"} - {format(parseISO(milestone.dueDate), "MMM d")}
              {milestone.project && ` • ${milestone.project.name}`}
            </p>
          </div>
          <Badge variant={type === "overdue" ? "destructive" : "secondary"} className="text-[10px]">
            {type === "overdue" ? "Overdue" : "Due Soon"}
          </Badge>
        </div>
      ))}
    </div>
  );
}
