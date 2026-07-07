"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { Users, Circle, MoreHorizontal } from "lucide-react";
import { cn } from "@/lib/utils";

const statusColors: Record<string, string> = {
  online: "bg-emerald-500",
  away: "bg-amber-500",
  "in-meeting": "bg-purple-500",
  "working-on-tasks": "bg-blue-500",
  "focus-mode": "bg-indigo-500",
  offline: "bg-muted-foreground/30",
};

const statusLabels: Record<string, string> = {
  online: "Online",
  away: "Away",
  "in-meeting": "In Meeting",
  "working-on-tasks": "Working",
  "focus-mode": "Focus Mode",
  offline: "Offline",
};

export default function TeamPresence({
  onlineUsers,
  totalMembers,
}: {
  onlineUsers: any[];
  totalMembers?: number;
}) {
  const maxVisible = 5;
  const visibleUsers = onlineUsers.slice(0, maxVisible);
  const remaining = onlineUsers.length - maxVisible;

  if (onlineUsers.length === 0) return null;

  return (
    <div className="flex items-center gap-3">
      <div className="flex -space-x-2">
        {visibleUsers.map((u: any, i: number) => (
          <motion.div
            key={u.id || i}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.05 }}
            className="relative group"
          >
            <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-semibold text-foreground overflow-hidden">
              {u.imageUrl ? (
                <Image src={u.imageUrl} alt={u.name || ""} width={32} height={32} className="object-cover w-full h-full" />
              ) : (
                (u.name || "U").slice(0, 2).toUpperCase()
              )}
            </div>
            <span className={cn(
              "absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background",
              statusColors[u.status] || statusColors.online
            )} />
            <div className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded-md bg-popover border text-[10px] font-medium text-popover-foreground whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-md">
              {u.name || "User"} — {statusLabels[u.status] || "Online"}
            </div>
          </motion.div>
        ))}
        {remaining > 0 && (
          <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-[10px] font-semibold text-muted-foreground">
            +{remaining}
          </div>
        )}
      </div>
      <span className="text-xs text-muted-foreground font-medium">
        {totalMembers ? `${onlineUsers.length}/${totalMembers}` : onlineUsers.length}
      </span>
    </div>
  );
}
