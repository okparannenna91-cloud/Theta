"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Calendar, Clock, Users, Plus, Play, Square, CheckCircle2,
  Circle, FileText, Trash2, MoreHorizontal, Mic, Brain, Target
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter
} from "@/components/ui/dialog";

interface MeetingListProps {
  projectId?: string;
}

const STATUS_COLORS: Record<string, string> = {
  scheduled: "bg-blue-500/10 text-blue-600 border-blue-500/30",
  live: "bg-amber-500/10 text-amber-600 border-amber-500/30",
  completed: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const PHASE_ICONS: Record<string, typeof Calendar> = {
  PRE_MEETING: Brain,
  LIVE_MEETING: Mic,
  POST_MEETING: FileText,
};

export function MeetingList({ projectId }: MeetingListProps) {
  const { activeWorkspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const [showCreate, setShowCreate] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTopic, setNewTopic] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["meetings", activeWorkspaceId, projectId],
    queryFn: async () => {
      const params = new URLSearchParams({ workspaceId: activeWorkspaceId! });
      if (projectId) params.set("projectId", projectId);
      const res = await fetch(`/api/meetings?${params}`);
      if (!res.ok) throw new Error("Failed to fetch meetings");
      return res.json();
    },
    enabled: !!activeWorkspaceId,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/meetings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle,
          topic: newTopic || undefined,
          description: newDescription || undefined,
          workspaceId: activeWorkspaceId,
          projectId: projectId || undefined,
        }),
      });
      if (!res.ok) throw new Error("Failed to create meeting");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      setShowCreate(false);
      setNewTitle("");
      setNewTopic("");
      setNewDescription("");
      toast.success("Meeting created");
    },
    onError: () => toast.error("Failed to create meeting"),
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      const res = await fetch(`/api/meetings/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/meetings/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["meetings"] });
      toast.success("Meeting deleted");
    },
  });

  const meetings = data?.meetings || [];

  const formatTime = (date: string) => {
    return new Date(date).toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "numeric", minute: "2-digit"
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full rounded-lg" />)}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="text-xs rounded-md px-2 py-0.5">
            {meetings.length} meeting{meetings.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogTrigger asChild>
            <Button size="sm" className="h-8 text-xs gap-1.5">
              <Plus className="h-3.5 w-3.5" /> New Meeting
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Meeting</DialogTitle>
              <DialogDescription>Schedule a new meeting with agenda generation</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-xs font-medium">Title *</label>
                <Input
                  placeholder="Weekly standup, Sprint review..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">Topic (for AI agenda)</label>
                <Input
                  placeholder="Product roadmap planning, Q3 review..."
                  value={newTopic}
                  onChange={(e) => setNewTopic(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium">Description</label>
                <Textarea
                  placeholder="Optional meeting description..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={3}
                />
              </div>
              {newTopic && (
                <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                  <div className="flex items-center gap-2 text-xs text-primary mb-1">
                    <Brain className="h-3 w-3" />
                    Nova will generate an AI agenda for this topic
                  </div>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" size="sm" onClick={() => setShowCreate(false)}>Cancel</Button>
              <Button size="sm" onClick={() => createMutation.mutate()} disabled={!newTitle || createMutation.isPending}>
                {createMutation.isPending ? "Creating..." : "Create Meeting"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {meetings.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center mb-4">
              <Calendar className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-semibold mb-1">No meetings yet</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-sm">
              Create meetings with AI-powered agenda generation and post-meeting briefs.
            </p>
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="h-4 w-4 mr-1.5" /> Schedule Meeting
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {meetings.map((meeting: any) => {
            const PhaseIcon = PHASE_ICONS[meeting.phase] || Calendar;
            const isExpanded = expandedId === meeting.id;
            const agendaItems = meeting.agendaItems || [];
            const decisions = meeting.decisions || [];
            const actionItems = meeting.actionItems || [];

            return (
              <Card
                key={meeting.id}
                className={cn(
                  "border shadow-sm transition-all cursor-pointer",
                  isExpanded && "border-primary/30 shadow-md"
                )}
                onClick={() => setExpandedId(isExpanded ? null : meeting.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={cn(
                        "w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0",
                        meeting.status === "live" ? "bg-amber-500/10" : "bg-muted"
                      )}>
                        <PhaseIcon className={cn(
                          "h-4 w-4",
                          meeting.status === "live" ? "text-amber-500" : "text-muted-foreground"
                        )} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-semibold truncate">{meeting.title}</h3>
                          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0 h-4 border", STATUS_COLORS[meeting.status])}>
                            {meeting.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {formatTime(meeting.createdAt)}
                          </span>
                          {meeting.participants && (
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {(meeting.participants || []).length} attendees
                            </span>
                          )}
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-3.5">
                            {meeting.phase?.replace("_", " ")}
                          </Badge>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      {meeting.status === "scheduled" && (
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7"
                          title="Start meeting"
                          onClick={() => updateMutation.mutate({
                            id: meeting.id,
                            data: { status: "live", phase: "LIVE_MEETING", startedAt: new Date().toISOString() }
                          })}
                        >
                          <Play className="h-3.5 w-3.5 text-emerald-500" />
                        </Button>
                      )}
                      {meeting.status === "live" && (
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7"
                          title="End meeting"
                          onClick={() => updateMutation.mutate({
                            id: meeting.id,
                            data: { status: "completed", phase: "POST_MEETING", endedAt: new Date().toISOString() }
                          })}
                        >
                          <Square className="h-3.5 w-3.5 text-destructive" />
                        </Button>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-7 w-7">
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => deleteMutation.mutate(meeting.id)} className="text-destructive">
                            <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t space-y-4" onClick={(e) => e.stopPropagation()}>
                      {meeting.description && (
                        <p className="text-xs text-muted-foreground">{meeting.description}</p>
                      )}

                      {agendaItems.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                            <Target className="h-3 w-3 text-primary" />
                            Agenda ({agendaItems.length} items)
                          </h4>
                          <ul className="space-y-1">
                            {agendaItems.map((item: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                <span className="text-primary font-mono">{i + 1}.</span>
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {decisions.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            Decisions ({decisions.length})
                          </h4>
                          <ul className="space-y-1">
                            {decisions.map((item: string, i: number) => (
                              <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                                <CheckCircle2 className="h-3 w-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {actionItems.length > 0 && (
                        <div>
                          <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5">
                            <Circle className="h-3 w-3 text-amber-500" />
                            Action Items ({actionItems.length})
                          </h4>
                          <ul className="space-y-1">
                            {actionItems.map((item: any, i: number) => (
                              <li key={i} className="flex items-center gap-2 text-xs text-muted-foreground">
                                <Circle className="h-3 w-3 text-amber-500 mt-0.5 flex-shrink-0" />
                                <span>{item.title}</span>
                                {item.assignee && (
                                  <Badge variant="outline" className="text-[10px] px-1 py-0 h-3.5">
                                    {item.assignee}
                                  </Badge>
                                )}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {meeting.summary && (
                        <div>
                          <h4 className="text-xs font-semibold mb-2">Summary</h4>
                          <p className="text-xs text-muted-foreground whitespace-pre-wrap">{meeting.summary}</p>
                        </div>
                      )}

                      {!meeting.summary && agendaItems.length === 0 && decisions.length === 0 && actionItems.length === 0 && (
                        <p className="text-xs text-muted-foreground text-center py-4">
                          Start the meeting to begin capturing notes and action items.
                        </p>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
