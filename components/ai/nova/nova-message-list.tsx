"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { FileIcon } from "lucide-react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { createAvatar } from "@dicebear/core";
import { notionists } from "@dicebear/collection";
import { ActivityStatus } from "@/components/ai/activity-status";
import { cn } from "@/lib/utils";
import type { Message } from "./types";

const novaAvatar = `data:image/svg+xml;utf8,${encodeURIComponent(
  createAvatar(notionists, { seed: "Aneka", backgroundColor: ["b6e3f4", "c0aede", "d1d4f9"] }).toString()
)}`;

const userAvatar = `data:image/svg+xml;utf8,${encodeURIComponent(
  createAvatar(notionists, { seed: "Felix", backgroundColor: ["f1f5f9"] }).toString()
)}`;

interface Props {
  messages: Message[];
  isStreaming: boolean;
  isLoading: boolean;
  lastPrompt: string;
}

export function NovaMessageList({ messages, isStreaming, isLoading, lastPrompt }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  return (
    <div
      ref={scrollRef}
      className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-3 sm:space-y-5 bg-gradient-to-b from-slate-50/50 to-white/30 dark:from-slate-950/50 dark:to-slate-950/30 scrollbar-hide"
    >
      {messages.map((msg, i) => (
        <motion.div
          key={msg.id || i}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: Math.min(i * 0.03, 0.3) }}
          className={cn("flex w-full", msg.role === "user" ? "justify-end" : "justify-start")}
        >
          <div className={cn("flex gap-2 max-w-[92%] sm:max-w-[88%]", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
            <div
              className={cn(
                "h-7 w-7 sm:h-8 sm:w-8 rounded-xl shrink-0 flex items-center justify-center overflow-hidden shadow-lg border-2 mt-1",
                msg.role === "nova"
                  ? "border-primary/20 bg-gradient-to-br from-primary/10 to-indigo-500/10"
                  : "border-slate-200 dark:border-slate-700 bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900"
              )}
            >
              <Image src={msg.role === "nova" ? novaAvatar : userAvatar} alt={msg.role} width={28} height={28} className="object-cover" />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <div
                className={cn(
                  "rounded-2xl px-3 py-2.5 sm:px-4 sm:py-3 text-[12px] sm:text-[13px] leading-relaxed shadow-sm break-words",
                  msg.role === "nova"
                    ? "bg-white dark:bg-slate-900/90 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800/50 rounded-tl-sm shadow-[0_2px_8px_rgba(0,0,0,0.04)]"
                    : "bg-primary text-white rounded-tr-sm shadow-md"
                )}
              >
                {msg.role === "nova" ? (
                  <div className="prose prose-slate dark:prose-invert prose-xs sm:prose-sm max-w-none prose-p:leading-relaxed prose-p:my-1 prose-headings:text-xs prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1 prose-table:text-[11px]">
                    <ReactMarkdown
                      remarkPlugins={[remarkGfm]}
                      components={{
                        table: ({ children }) => (
                          <div className="overflow-x-auto my-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                            <table className="w-full text-[11px] border-collapse bg-white dark:bg-slate-900">{children}</table>
                          </div>
                        ),
                        th: ({ children }) => (
                          <th className="px-3 py-2 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-semibold text-left border-b border-slate-200 dark:border-slate-700">
                            {children}
                          </th>
                        ),
                        td: ({ children }) => (
                          <td className="px-3 py-2 border-b border-slate-100 dark:border-slate-800 text-slate-600 dark:text-slate-400">{children}</td>
                        ),
                        a: ({ children, href }) => (
                          <a href={href} className="text-primary font-medium hover:underline" target="_blank" rel="noopener noreferrer">
                            {children}
                          </a>
                        ),
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                    {isStreaming && i === messages.length - 1 && msg.content.length > 0 && (
                      <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5 rounded-sm align-text-bottom" />
                    )}
                  </div>
                ) : (
                  <span className="text-[12px] sm:text-[13px] font-medium">{msg.content}</span>
                )}

                {msg.attachments && msg.attachments.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-1.5">
                    {msg.attachments.map((file, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-1 px-2 py-1 bg-slate-50 dark:bg-slate-800 rounded-lg text-[10px] font-medium text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700"
                      >
                        <FileIcon className="w-2.5 h-2.5 text-primary" />
                        <span className="truncate max-w-[70px]">{file.name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className={cn("text-[9px] px-1 opacity-30 font-medium", msg.role === "user" ? "text-right" : "text-left")}>
                {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </div>
            </div>
          </div>
        </motion.div>
      ))}

      {(isLoading || isStreaming) && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
          <div className="flex gap-2 items-center bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl rounded-tl-sm px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-sm">
            <ActivityStatus prompt={lastPrompt} isLoading={isLoading} isStreaming={isStreaming} />
          </div>
        </motion.div>
      )}
    </div>
  );
}
