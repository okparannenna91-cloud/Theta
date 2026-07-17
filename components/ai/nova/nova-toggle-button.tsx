"use client";

import { motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  isOpen: boolean;
  onClick: () => void;
}

export function NovaToggleButton({ isOpen, onClick }: Props) {
  return (
    <motion.button
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 sm:gap-3 h-12 sm:h-14 px-4 sm:px-5 rounded-2xl shadow-lg transition-all z-50 border border-white/10 backdrop-blur-xl",
        isOpen
          ? "bg-slate-900/90 text-white"
          : "bg-gradient-to-br from-primary to-indigo-600 text-white shadow-primary/30 hover:shadow-primary/40"
      )}
    >
      <div className="relative">
        <div className="h-7 w-7 sm:h-8 sm:w-8 rounded-xl bg-white/20 backdrop-blur-lg flex items-center justify-center shadow-inner">
          <Sparkles className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-white" />
        </div>
        {!isOpen && (
          <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5 sm:h-3 sm:w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 sm:h-3 sm:w-3 bg-emerald-500 border-2 border-white"></span>
          </span>
        )}
      </div>
      {!isOpen && <span className="font-semibold text-xs sm:text-sm tracking-tight">Nova</span>}
      {isOpen && <X className="h-4 w-4 sm:h-5 sm:w-5" />}
    </motion.button>
  );
}
