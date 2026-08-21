"use client";

import React, { memo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check, Sparkles, User } from "lucide-react";
import { cn } from "@/lib/utils";

interface MessageBubbleProps {
  role: "user" | "assistant" | "system";
  content: string;
  createdAt?: string;
  isStreaming?: boolean;
}

function CodeBlock({ language, value }: { language: string; value: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="relative group my-3">
      <button
        onClick={handleCopy}
        className="absolute right-2 top-2 z-10 rounded-md bg-zinc-800/80 p-1.5 text-zinc-300 opacity-0 transition-opacity hover:bg-zinc-700 hover:text-white group-hover:opacity-100"
        aria-label="Copy code"
      >
        {copied ? <Check className="h-4 w-4 text-green-400" /> : <Copy className="h-4 w-4" />}
      </button>
      <SyntaxHighlighter
        style={oneDark}
        language={language || "text"}
        PreTag="div"
        customStyle={{
          margin: 0,
          borderRadius: "0.5rem",
          fontSize: "0.8125rem",
        }}
      >
        {value}
      </SyntaxHighlighter>
    </div>
  );
}

export const MessageBubble = memo(function MessageBubble({
  role,
  content,
  isStreaming,
}: MessageBubbleProps) {
  const isUser = role === "user";

  if (isUser) {
    return (
      <div className="flex justify-end animate-in fade-in slide-in-from-bottom-1 duration-200">
        <div className="flex max-w-[85%] items-start gap-2 sm:max-w-[75%]">
          <div className="rounded-2xl rounded-br-sm bg-violet-600 px-4 py-2.5 text-sm leading-relaxed text-white shadow-sm">
            <p className="whitespace-pre-wrap break-words">{content}</p>
          </div>
          <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-200 dark:bg-zinc-700">
            <User className="h-4 w-4 text-zinc-600 dark:text-zinc-300" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-start animate-in fade-in slide-in-from-bottom-1 duration-200">
      <div className="flex max-w-[85%] items-start gap-2 sm:max-w-[75%]">
        <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-violet-500 to-fuchsia-500">
          <Sparkles className="h-4 w-4 text-white" />
        </div>
        <div
          className={cn(
            "prose prose-sm prose-zinc dark:prose-invert max-w-none rounded-2xl rounded-bl-sm bg-white px-4 py-2.5 shadow-sm ring-1 ring-zinc-200 dark:bg-zinc-900 dark:ring-zinc-700",
            "[&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
            "[&_pre]:bg-transparent [&_pre]:p-0",
            "[&_code:not(pre code)]:rounded [&_code:not(pre code)]:bg-zinc-100 [&_code:not(pre code)]:px-1.5 [&_code:not(pre code)]:py-0.5 [&_code:not(pre code)]:font-mono [&_code:not(pre code)]:text-[0.8em] dark:[&_code:not(pre code)]:bg-zinc-800",
            "[&_a]:text-violet-600 [&_a]:underline dark:[&_a]:text-violet-400",
            "[&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5",
            "[&_table]:w-full [&_th]:border [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:px-2 [&_td]:py-1"
          )}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: CodeBlock as any }}>
            {content}
          </ReactMarkdown>
          {isStreaming && (
            <span className="ml-0.5 inline-block h-4 w-2 animate-pulse rounded-sm bg-violet-500 align-text-bottom" />
          )}
        </div>
      </div>
    </div>
  );
});