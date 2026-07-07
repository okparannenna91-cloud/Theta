"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  CheckCircle2,
  Clock,
  FileText,
  UserPlus,
  TrendingUp,
  AlertCircle,
  ArrowRight,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface ActivityEvent {
  id: string;
  action: string;
  entityType: string;
  entityId?: string;
  metadata?: Record<string, any>;
  user?: { name?: string; imageUrl?: string };
  createdAt: string;
}

function ActivityIcon({ action, entityType }: { action: string; entityType: string }) {
  const iconMap: Record<string, React.ReactNode> = {
    created: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
    completed: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
    updated: <Zap className="w-3.5 h-3.5 text-blue-500" />,
    deleted: <AlertCircle className="w-3.5 h-3.5 text-rose-500" />,
    uploaded: <FileText className="w-3.5 h-3.5 text-purple-500" />,
    invited: <UserPlus className="w-3.5 h-3.5 text-amber-500" />,
    milestone: <TrendingUp className="w-3.5 h-3.5 text-primary" />,
  };
  return (
    <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center flex-shrink-0">
      {iconMap[action] || <Activity className="w-3.5 h-3.5 text-muted-foreground" />}
    </div>
  );
}

export default function TeamActivityFeed({ workspaceId, teamId }: { workspaceId: string; teamId: string }) {
  const [activities, setActivities] = useState<ActivityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!workspaceId) return;
    setLoading(true);
    fetch(`/api/activity?workspaceId=${workspaceId}&limit=8`)
      .then(res => res.json())
      .then(data => {
        const items = Array.isArray(data) ? data : data?.activities ?? [];
        setActivities(items);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [workspaceId]);

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-sm font-semibold text-foreground">Team Activity</span>
          <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
            {activities.length}
          </span>
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
            <div className="px-4 pb-4 space-y-2 max-h-[300px] overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center py-6">
                  <div className="w-5 h-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
                </div>
              ) : activities.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-4">No recent activity</p>
              ) : (
                activities.map((event) => (
                  <div key={event.id} className="flex items-start gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
                    <ActivityIcon action={event.action} entityType={event.entityType} />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground leading-relaxed">
                        <span className="font-semibold">{event.user?.name || "Someone"}</span>
                        {" "}{event.action}{" "}
                        <span className="text-muted-foreground">{event.entityType}</span>
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {formatDistanceToNow(new Date(event.createdAt), { addSuffix: true })}
                      </p>
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
