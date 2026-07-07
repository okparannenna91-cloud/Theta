"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar,
  FileText,
  Link2,
  StickyNote,
  FolderKanban,
  ExternalLink,
  ArrowRight,
  Loader2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Widget {
  id: string;
  type: "calendar" | "files" | "links" | "notes" | "projects";
  title: string;
  items: { label: string; url?: string; date?: string; }[];
}

export default function PinnedWidgets({ workspaceId, teamId }: { workspaceId: string; teamId: string }) {
  const [collapsed, setCollapsed] = useState(true);
  const [widgets, setWidgets] = useState<Widget[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!workspaceId || !teamId || collapsed) return;
    setLoading(true);
    Promise.all([
      fetch(`/api/projects?workspaceId=${workspaceId}&teamId=${teamId}&limit=3`).then(r => r.json()),
      fetch(`/api/calendar?workspaceId=${workspaceId}&teamId=${teamId}&limit=3`).then(r => r.json()).catch(() => ({})),
    ])
      .then(([projectsData, calendarData]) => {
        const projects = Array.isArray(projectsData) ? projectsData : projectsData?.projects ?? [];
        const events = Array.isArray(calendarData) ? calendarData : calendarData?.events ?? [];

        const result: Widget[] = [];
        if (projects.length > 0) {
          result.push({
            id: "projects",
            type: "projects",
            title: "Active Projects",
            items: projects.map((p: any) => ({ label: p.name, url: `/projects/${p.id}` })),
          });
        }
        if (events.length > 0) {
          result.push({
            id: "calendar",
            type: "calendar",
            title: "Upcoming Events",
            items: events.slice(0, 3).map((e: any) => ({
              label: e.title,
              date: e.startDate || e.date,
            })),
          });
        }
        setWidgets(result);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId, teamId, collapsed]);

  const widgetIcon: Record<string, React.ReactNode> = {
    calendar: <Calendar className="w-4 h-4 text-rose-500" />,
    files: <FileText className="w-4 h-4 text-blue-500" />,
    links: <Link2 className="w-4 h-4 text-purple-500" />,
    notes: <StickyNote className="w-4 h-4 text-amber-500" />,
    projects: <FolderKanban className="w-4 h-4 text-primary" />,
  };

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <FolderKanban className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Pinned Widgets</span>
        </div>
        <ArrowRight className={`w-4 h-4 text-muted-foreground transition-transform ${collapsed ? "" : "rotate-90"}`} />
      </button>

      <AnimatePresence>
        {!collapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-4">
              {loading ? (
                <div className="flex justify-center py-4">
                  <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                </div>
              ) : widgets.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No widgets available</p>
              ) : (
                widgets.map((widget) => (
                  <div key={widget.id}>
                    <div className="flex items-center gap-1.5 mb-2">
                      {widgetIcon[widget.type]}
                      <span className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
                        {widget.title}
                      </span>
                    </div>
                    <div className="space-y-1">
                      {widget.items.map((item, j) => (
                        <div key={j}>
                          {item.url ? (
                            <a
                              href={item.url}
                              className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted/50 transition-colors group text-xs text-foreground"
                            >
                              <span className="w-1 h-1 rounded-full bg-primary/40" />
                              <span className="flex-1 truncate">{item.label}</span>
                              <ExternalLink className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </a>
                          ) : (
                            <div className="flex items-center gap-2 p-2 text-xs text-foreground">
                              <span className="w-1 h-1 rounded-full bg-rose-500/40" />
                              <span className="flex-1 truncate">{item.label}</span>
                              {item.date && (
                                <span className="text-muted-foreground shrink-0">
                                  {new Date(item.date).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
