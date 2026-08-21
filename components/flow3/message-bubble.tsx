"use client";

import React, { memo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Copy, Check } from "lucide-react";
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
        <div className="max-w-[85%] sm:max-w-[75%]">
          <div className="rounded-2xl rounded-br-sm bg-violet-600 px-4 py-2.5 text-sm leading-relaxed text-white shadow-sm">
            <p className="whitespace-pre-wrap break-words">{content}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 duration-200">
      <div
        className={cn(
          "prose prose-sm prose-zinc dark:prose-invert max-w-none",
          "[&_p:first-child]:mt-0 [&_p:last-child]:mb-0",
          "[&_pre]:bg-transparent [&_pre]:p-0",
          "[&_code:not(pre code)]:rounded [&_code:not(pre code)]:bg-zinc-100 [&_code:not(pre code)]:px-1.5 [&_code:not(pre code)]:py-0.5 [&_code:not(pre code)]:font-mono [&_code:not(pre code)]:text-[0.8em] dark:[&_code:not(pre code)]:bg-zinc-800",
          "[&_a]:text-violet-600 [&_a]:underline dark:[&_a]:text-violet-400",
          "[&_ul]:my-2 [&_ol]:my-2 [&_li]:my-0.5",
          "[&_table]:w-full [&_table]:text-xs [&_th]:border [&_th]:border-zinc-300 [&_th]:bg-zinc-50 [&_th]:px-2 [&_th]:py-1 [&_td]:border [&_td]:border-zinc-300 [&_td]:px-2 [&_td]:py-1 dark:[&_th]:border-zinc-700 dark:[&_th]:bg-zinc-900 dark:[&_td]:border-zinc-700",
          "[&_blockquote]:border-violet-300 dark:[&_blockquote]:border-violet-700",
          "[&_hr]:border-zinc-200 dark:[&_hr]:border-zinc-800"
        )}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={{ code: CodeBlock as any }}>
          {content}
        </ReactMarkdown>
      </div>
      {isStreaming && (
        <span className="ml-0.5 inline-block h-4 w-2 animate-pulse rounded-sm bg-violet-500 align-text-bottom" />
      )}
    </div>
  );
});