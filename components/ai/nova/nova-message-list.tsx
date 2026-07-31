"use client";

import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { FileIcon, RotateCcw, Sparkles } from "lucide-react";
import Image from "next/image";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ActivityStatus } from "@/components/ai/activity-status";
import { CodeBlock, InlineCode } from "./code-block";
import { SuggestedPrompts } from "./suggested-prompts";
import { cn } from "@/lib/utils";
import type { Message } from "./types";

interface Props {
  messages: Message[];
  isStreaming: boolean;
  isLoading: boolean;
  lastPrompt: string;
  userImageUrl?: string | null;
  onRetry?: (prompt: string) => void;
  onSuggestedPrompt?: (prompt: string) => void;
}

export function NovaMessageList({ messages, isStreaming, isLoading, lastPrompt, userImageUrl, onRetry, onSuggestedPrompt }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const userMessages = messages.filter(m => m.role === "user");
  const showSuggestions = userMessages.length === 0 && !isLoading && !isStreaming;

  return (
    <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-6 space-y-4 scrollbar-hide">
      {showSuggestions && onSuggestedPrompt && (
        <SuggestedPrompts onSelect={onSuggestedPrompt} />
      )}

      {messages.map((msg, i) => {
        const isLastNovaMsg = msg.role === "nova" && i === messages.length - 1;
        const canRetry = isLastNovaMsg && !isStreaming && !isLoading && onRetry && i > 0;

        return (
          <motion.div
            key={msg.id || i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(i * 0.03, 0.3) }}
            className={cn("group flex w-full", msg.role === "user" ? "justify-end" : "justify-start")}
          >
            <div className={cn("flex gap-2.5 max-w-[92%] sm:max-w-[80%]", msg.role === "user" ? "flex-row-reverse" : "flex-row")}>
              <div
                className={cn(
                  "h-7 w-7 rounded-full shrink-0 flex items-center justify-center mt-1 overflow-hidden shadow-sm",
                  msg.role === "nova"
                    ? "bg-indigo-600"
                    : "bg-slate-200 dark:bg-slate-700"
                )}
              >
                {msg.role === "nova" ? (
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                ) : userImageUrl ? (
                  <Image src={userImageUrl} alt="You" width={28} height={28} className="object-cover" />
                ) : (
                  <span className="h-2 w-2 rounded-full bg-white dark:bg-slate-300" />
                )}
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <div
                  className={cn(
                    "px-4 py-2.5 text-sm leading-relaxed break-words",
                    msg.role === "nova"
                      ? "bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl rounded-bl-md shadow-[0_1px_2px_rgba(0,0,0,0.04)] text-slate-800 dark:text-slate-200"
                      : "bg-indigo-600 rounded-2xl rounded-br-md text-white"
                  )}
                >
                  {msg.role === "nova" ? (
                    <div className="prose prose-slate dark:prose-invert prose-xs sm:prose-sm max-w-none prose-p:leading-relaxed prose-p:my-1 prose-headings:text-xs prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1 prose-table:text-[11px]">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm]}
                        components={{
                          code({ className, children, ...props }) {
                            const match = /language-(\w+)/.exec(className || "");
                            const isInline = !match && !String(children).includes("\n");
                            if (isInline) {
                              return <InlineCode>{children}</InlineCode>;
                            }
                            return (
                              <CodeBlock language={match?.[1]} className={className}>
                                {String(children).replace(/\n$/, "")}
                              </CodeBlock>
                            );
                          },
                          pre({ children }) {
                            return <>{children}</>;
                          },
                          table: ({ children }) => (
                            <div className="overflow-x-auto my-2 rounded-lg border border-slate-200 dark:border-slate-800">
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
                            <a href={href} className="text-indigo-600 dark:text-indigo-400 font-medium hover:underline" target="_blank" rel="noopener noreferrer">
                              {children}
                            </a>
                          ),
                        }}
                      >
                        {msg.content}
                      </ReactMarkdown>
                      {isStreaming && i === messages.length - 1 && msg.content.length > 0 && (
                        <span className="inline-block w-1.5 h-4 bg-indigo-600 animate-pulse ml-0.5 rounded-sm align-text-bottom" />
                      )}
                    </div>
                  ) : (
                    <span className="text-sm font-medium text-white">{msg.content}</span>
                  )}

                  {msg.attachments && msg.attachments.length > 0 && (
                    <div className={cn("mt-2 pt-2 flex flex-wrap gap-1.5", msg.role === "nova" ? "border-t border-slate-100 dark:border-slate-800" : "border-t border-white/20")}>
                      {msg.attachments.map((file, idx) => (
                        <div
                          key={idx}
                          className={cn(
                            "flex items-center gap-1 px-2 py-1 rounded-md text-[10px] font-medium",
                            msg.role === "nova"
                              ? "bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-100 dark:border-slate-700"
                              : "bg-white/20 text-white"
                          )}
                        >
                          <FileIcon className="w-2.5 h-2.5" />
                          <span className="truncate max-w-[70px]">{file.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {canRetry && (
                  <div className={cn("flex items-center gap-2 px-1", msg.role === "user" ? "justify-end" : "justify-start")}>
                    <button
                      onClick={() => {
                        const prevUserMsg = messages[i - 1];
                        if (prevUserMsg?.role === "user") {
                          onRetry(prevUserMsg.content);
                        }
                      }}
                      className="flex items-center gap-1 text-[11px] font-medium text-slate-400 hover:text-indigo-600 transition-colors opacity-0 group-hover:opacity-100"
                      title="Retry this message"
                    >
                      <RotateCcw className="w-3 h-3" />
                      Retry
                    </button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}

      {(isLoading || isStreaming) && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex justify-start">
          <div className="flex gap-2.5 items-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-4 py-3 shadow-sm">
            <div className="h-7 w-7 rounded-lg bg-indigo-600 flex items-center justify-center shrink-0">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <ActivityStatus prompt={lastPrompt} isLoading={isLoading} isStreaming={isStreaming} />
          </div>
        </motion.div>
      )}
    </div>
  );
}
