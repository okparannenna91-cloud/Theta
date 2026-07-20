"use client";

import { useState, useCallback } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "@/lib/utils";

interface CodeBlockProps {
  children: string;
  className?: string;
  language?: string;
}

export function CodeBlock({ children, className, language }: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(children);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement("textarea");
      textarea.value = children;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [children]);

  const displayLang = language || "text";

  return (
    <div className="group/code relative my-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 overflow-hidden">
      <div className="flex items-center justify-between px-3 py-1.5 border-b border-slate-200 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/30">
        <span className="text-[10px] font-mono font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {displayLang}
        </span>
        <button
          onClick={handleCopy}
          className={cn(
            "flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-medium transition-all",
            copied
              ? "bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400"
              : "opacity-0 group-hover/code:opacity-100 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 dark:text-slate-400"
          )}
        >
          {copied ? (
            <>
              <Check className="w-3 h-3" />
              Copied
            </>
          ) : (
            <>
              <Copy className="w-3 h-3" />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 text-[11px] leading-relaxed font-mono text-slate-800 dark:text-slate-300">
        <code>{children}</code>
      </pre>
    </div>
  );
}

export function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 mx-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[11px] font-mono font-medium text-rose-600 dark:text-rose-400 border border-slate-200 dark:border-slate-700">
      {children}
    </code>
  );
}
