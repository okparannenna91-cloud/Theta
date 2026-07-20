"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Clock, Play, Pause, Square, Plus, Trash2, Calendar, DollarSign, BarChart3 } from "lucide-react";

export default function TimeTrackingPage() {
  const { activeWorkspaceId } = useWorkspace();
  const [tab, setTab] = useState<"timer" | "log" | "report" | "billable">("timer");

  const { data: timerStatus, isLoading: timerLoading } = useQuery({
    queryKey: ["timer-status", activeWorkspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/time-tracking/timer?workspaceId=${activeWorkspaceId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!activeWorkspaceId,
  });

  const { data: logs, isLoading: logsLoading } = useQuery({
    queryKey: ["time-logs", activeWorkspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/time-tracking/log?workspaceId=${activeWorkspaceId}&limit=50`);
      if (!res.ok) return { entries: [] };
      return res.json();
    },
    enabled: !!activeWorkspaceId,
  });

  const { data: report } = useQuery({
    queryKey: ["time-report", activeWorkspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/time-tracking/report?workspaceId=${activeWorkspaceId}&days=30`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!activeWorkspaceId && tab === "report",
  });

  const { data: billable } = useQuery({
    queryKey: ["billable-report", activeWorkspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/time-tracking/billable?workspaceId=${activeWorkspaceId}&days=30`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!activeWorkspaceId && tab === "billable",
  });

  const isRunning = !!timerStatus?.isRunning;

  const handleStartTimer = async () => {
    await fetch("/api/time-tracking/timer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: activeWorkspaceId, action: "start" }),
    });
  };

  const handleStopTimer = async () => {
    await fetch("/api/time-tracking/timer", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ workspaceId: activeWorkspaceId, action: "stop" }),
    });
  };

  const handleDeleteLog = async (id: string) => {
    await fetch(`/api/time-tracking/log?id=${id}&workspaceId=${activeWorkspaceId}`, { method: "DELETE" });
  };

  const formatDuration = (minutes: number) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return h > 0 ? `${h}h ${m}m` : `${m}m`;
  };

  const tabs = [
    { id: "timer" as const, label: "Timer", icon: Clock },
    { id: "log" as const, label: "Log", icon: Calendar },
    { id: "report" as const, label: "Reports", icon: BarChart3 },
    { id: "billable" as const, label: "Billable", icon: DollarSign },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Time Tracking</h1>
          <p className="text-sm text-muted-foreground mt-1">Track time, generate reports, and manage billing</p>
        </div>
        <div className="flex items-center gap-2">
          {isRunning ? (
            <Button variant="destructive" onClick={handleStopTimer}>
              <Square className="h-4 w-4 mr-2" />
              Stop Timer
            </Button>
          ) : (
            <Button onClick={handleStartTimer}>
              <Play className="h-4 w-4 mr-2" />
              Start Timer
            </Button>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              tab === t.id
                ? "text-foreground border-primary"
                : "text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            <t.icon className="h-4 w-4" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === "timer" && (
        <div className="space-y-6">
          <Card>
            <CardContent className="p-8 text-center">
              <div className="text-6xl font-mono font-bold mb-4">
                {timerStatus?.elapsed ? formatDuration(timerStatus.elapsed) : "0m"}
              </div>
              <p className="text-sm text-muted-foreground mb-6">
                {isRunning ? `Tracking: ${timerStatus?.description || "No description"}` : "No timer running"}
              </p>
              <div className="flex items-center justify-center gap-3">
                {isRunning ? (
                  <Button variant="destructive" onClick={handleStopTimer} size="lg">
                    <Square className="h-5 w-5 mr-2" />
                    Stop
                  </Button>
                ) : (
                  <Button onClick={handleStartTimer} size="lg">
                    <Play className="h-5 w-5 mr-2" />
                    Start Timer
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent Sessions</CardTitle>
            </CardHeader>
            <CardContent>
              {logsLoading ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : !logs?.entries?.length ? (
                <p className="text-sm text-muted-foreground text-center py-8">No time entries yet. Start tracking!</p>
              ) : (
                <div className="space-y-2">
                  {logs.entries.slice(0, 5).map((entry: any) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Clock className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">{entry.description || "Untitled"}</p>
                          <p className="text-xs text-muted-foreground">{new Date(entry.date).toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="text-xs">{formatDuration(entry.duration)}</Badge>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteLog(entry.id)}>
                          <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {tab === "log" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Time Entries</CardTitle>
            <CardDescription>All recorded time entries</CardDescription>
          </CardHeader>
          <CardContent>
            {logsLoading ? (
              <div className="space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-12 w-full" />)}</div>
            ) : !logs?.entries?.length ? (
              <p className="text-sm text-muted-foreground text-center py-8">No time entries found.</p>
            ) : (
              <div className="space-y-2">
                {logs.entries.map((entry: any) => (
                  <div key={entry.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30 transition-colors">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">{entry.description || "Untitled"}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(entry.date).toLocaleDateString()} {entry.taskId && `• Task: ${entry.taskId}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="text-xs">{formatDuration(entry.duration)}</Badge>
                      {entry.billable && <Badge className="text-xs bg-emerald-500/15 text-emerald-600">Billable</Badge>}
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => handleDeleteLog(entry.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "report" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Time Report (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {report ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Total Time</p>
                  <p className="text-2xl font-bold">{formatDuration(report.totalMinutes || 0)}</p>
                </div>
                <div className="p-4 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Entries</p>
                  <p className="text-2xl font-bold">{report.totalEntries || 0}</p>
                </div>
                <div className="p-4 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Daily Average</p>
                  <p className="text-2xl font-bold">{formatDuration(report.dailyAverage || 0)}</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No report data available.</p>
            )}
          </CardContent>
        </Card>
      )}

      {tab === "billable" && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Billable Hours (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            {billable ? (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Billable Time</p>
                  <p className="text-2xl font-bold">{formatDuration(billable.billableMinutes || 0)}</p>
                </div>
                <div className="p-4 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Non-Billable</p>
                  <p className="text-2xl font-bold">{formatDuration(billable.nonBillableMinutes || 0)}</p>
                </div>
                <div className="p-4 rounded-lg border">
                  <p className="text-xs text-muted-foreground mb-1">Billable Rate</p>
                  <p className="text-2xl font-bold">{billable.billableRate || 0}%</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-8">No billable data available.</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
