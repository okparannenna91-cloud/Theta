"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Trophy,
  Rocket,
  Star,
  Zap,
  Target,
  Award,
  Sparkles,
  ArrowRight,
  Medal,
} from "lucide-react";

interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string;
  achievedAt: string;
}

const iconMap: Record<string, React.ReactNode> = {
  trophy: <Trophy className="w-5 h-5 text-amber-500" />,
  rocket: <Rocket className="w-5 h-5 text-blue-500" />,
  star: <Star className="w-5 h-5 text-yellow-500" />,
  zap: <Zap className="w-5 h-5 text-purple-500" />,
  target: <Target className="w-5 h-5 text-emerald-500" />,
  award: <Award className="w-5 h-5 text-rose-500" />,
  medal: <Medal className="w-5 h-5 text-primary" />,
};

export default function TeamAchievements({ teamId, workspaceId }: { teamId: string; workspaceId: string }) {
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [collapsed, setCollapsed] = useState(true);

  useEffect(() => {
    if (!workspaceId || !teamId || collapsed) return;
    fetch(`/api/activity?workspaceId=${workspaceId}&teamId=${teamId}&limit=5&milestones=true`)
      .then(res => res.json())
      .then(data => {
        const items = Array.isArray(data) ? data : data?.activities ?? [];
        const mapped: Achievement[] = items
          .filter((a: any) => a.action === "milestone" || a.action === "completed")
          .slice(0, 5)
          .map((a: any, i: number) => ({
            id: a.id || `ach-${i}`,
            title: a.metadata?.title || `${a.action} ${a.entityType}`,
            description: a.metadata?.description || `Achieved by ${a.user?.name || "the team"}`,
            icon: ["trophy", "rocket", "star", "zap", "target"][i % 5],
            achievedAt: a.createdAt,
          }));
        setAchievements(mapped);
      })
      .catch(() => {});
  }, [workspaceId, teamId, collapsed]);

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          <span className="text-sm font-semibold text-foreground">Achievements</span>
          {achievements.length > 0 && (
            <span className="text-[10px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded-full">
              {achievements.length}
            </span>
          )}
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
            <div className="px-4 pb-4 space-y-2">
              {achievements.length === 0 ? (
                <div className="flex flex-col items-center py-6 text-center">
                  <Sparkles className="w-8 h-8 text-muted-foreground/30 mb-2" />
                  <p className="text-xs text-muted-foreground">No achievements yet</p>
                  <p className="text-[10px] text-muted-foreground/60">Complete milestones to unlock them</p>
                </div>
              ) : (
                achievements.map((ach, i) => (
                  <motion.div
                    key={ach.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 p-3 rounded-lg bg-gradient-to-r from-amber-500/5 to-transparent border border-amber-500/10"
                  >
                    <div className="w-10 h-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                      {iconMap[ach.icon] || <Star className="w-5 h-5 text-amber-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-foreground">{ach.title}</p>
                      <p className="text-[10px] text-muted-foreground">{ach.description}</p>
                    </div>
                    <Rocket className="w-4 h-4 text-amber-500/40" />
                  </motion.div>
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
