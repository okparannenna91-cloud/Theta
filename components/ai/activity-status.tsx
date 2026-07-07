"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getStatusSequence, getPreStreamStatuses, STATUSES, type StatusKey } from "@/lib/nova/activity-statuses";

interface ActivityStatusProps {
  prompt: string;
  isLoading: boolean;
  isStreaming: boolean;
}

export function ActivityStatus({ prompt, isLoading, isStreaming }: ActivityStatusProps) {
  const [phase, setPhase] = useState<"idle" | "pre-stream" | "drafting" | "done">("idle");
  const [currentKey, setCurrentKey] = useState<StatusKey>("UNDERSTANDING");
  const preStreamRef = useRef<StatusKey[]>([]);
  const preIdxRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (isLoading && !isStreaming) {
      clearTimer();
      const seq = getStatusSequence(prompt);
      const pre = getPreStreamStatuses(seq);
      preStreamRef.current = pre;
      preIdxRef.current = 0;
      setPhase("pre-stream");
      setCurrentKey(pre[0] || "UNDERSTANDING");
    }
  }, [isLoading, isStreaming, prompt]);

  useEffect(() => {
    if (phase === "pre-stream") {
      const pre = preStreamRef.current;
      if (preIdxRef.current >= pre.length) {
        setPhase("drafting");
        setCurrentKey("DRAFTING");
        return;
      }

      clearTimer();
      timerRef.current = setTimeout(() => {
        preIdxRef.current += 1;
        if (preIdxRef.current >= pre.length) {
          setPhase("drafting");
          setCurrentKey("DRAFTING");
        } else {
          setCurrentKey(pre[preIdxRef.current]);
        }
      }, 1800);
    }

    if (phase === "pre-stream" && isStreaming) {
      clearTimer();
      setPhase("drafting");
      setCurrentKey("DRAFTING");
    }

    return clearTimer;
  }, [phase, isStreaming]);

  useEffect(() => {
    if (phase === "drafting" && !isLoading && !isStreaming) {
      setPhase("done");
      setCurrentKey("DONE");
      clearTimer();
      timerRef.current = setTimeout(() => {
        setPhase("idle");
      }, 2000);
    }

    return clearTimer;
  }, [phase, isLoading, isStreaming]);

  if (phase === "idle") return null;

  const status = STATUSES[currentKey];

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={currentKey}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        transition={{ duration: 0.2, ease: "easeInOut" }}
        className="flex items-center gap-2 px-1"
      >
        <motion.span
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.15, delay: 0.05 }}
          className="text-sm"
        >
          {status.emoji}
        </motion.span>
        <span className="text-xs font-medium text-muted-foreground">
          {status.label}
          {phase === "drafting" && (
            <span className="inline-flex ml-0.5">
              <span className="animate-bounce [animation-delay:-0.3s]">.</span>
              <span className="animate-bounce [animation-delay:-0.15s]">.</span>
              <span className="animate-bounce">.</span>
            </span>
          )}
        </span>
      </motion.div>
    </AnimatePresence>
  );
}
