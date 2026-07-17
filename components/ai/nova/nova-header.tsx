"use client";

import { Sparkles, X, Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  isStreaming: boolean;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  onClose: () => void;
}

export function NovaHeader({ isStreaming, isMinimized, onToggleMinimize, onClose }: Props) {
  return (
    <div className="relative p-4 sm:p-5 bg-gradient-to-br from-primary via-primary/90 to-indigo-700 text-white flex items-center justify-between shrink-0 shadow-lg overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,0.15),transparent_60%)]" />
      <div className="flex items-center gap-3 relative z-10">
        <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-white/20 backdrop-blur-xl flex items-center justify-center border border-white/30 shadow-lg shadow-black/10">
          <Sparkles className="h-4 w-4 sm:h-5 sm:w-5 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="font-extrabold text-sm sm:text-base tracking-tight leading-tight">Nova</span>
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "h-1.5 w-1.5 rounded-full shadow-lg",
                isStreaming ? "bg-yellow-400 shadow-yellow-500/50 animate-pulse" : "bg-emerald-400 shadow-emerald-500/50"
              )}
            />
            <span className="text-[10px] text-white/70 font-medium">{isStreaming ? "Responding..." : "AI Connected"}</span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1 relative z-10">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl text-white/80 hover:text-white hover:bg-white/15 transition-all"
          onClick={onToggleMinimize}
        >
          {isMinimized ? <Maximize2 className="h-3.5 w-3.5" /> : <Minimize2 className="h-3.5 w-3.5" />}
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 sm:h-9 sm:w-9 rounded-xl text-white/80 hover:text-white hover:bg-rose-500/30 transition-all"
          onClick={onClose}
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
