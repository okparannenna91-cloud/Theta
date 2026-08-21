"use client";

import React, { useRef, useState } from "react";
import { ArrowUp, Square, Paperclip, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ComposerProps {
  onSend: (text: string) => void;
  onStop?: () => void;
  isStreaming: boolean;
  disabled?: boolean;
  placeholder?: string;
}

export function Composer({ onSend, onStop, isStreaming, disabled, placeholder }: ComposerProps) {
  const [value, setValue] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const submit = () => {
    const text = value.trim();
    if (!text || isStreaming || disabled) return;
    setValue("");
    if (textareaRef.current) textareaRef.current.style.height = "auto";
    onSend(text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setValue(e.target.value);
    const el = e.target;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 200)}px`;
  };

  return (
    <div className="border-t border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-950">
      <div
        className={cn(
          "flex items-end gap-2 rounded-2xl border border-zinc-200 bg-white px-3 py-2 shadow-sm transition-colors focus-within:border-violet-400 focus-within:ring-2 focus-within:ring-violet-100 dark:border-zinc-700 dark:bg-zinc-900 dark:focus-within:border-violet-500 dark:focus-within:ring-violet-900/30",
          disabled && "opacity-60"
        )}
      >
        <button
          type="button"
          className="mb-1 rounded-lg p-1.5 text-zinc-400 transition-colors hover:bg-zinc-100 hover:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-300"
          aria-label="Attach file (coming soon)"
          disabled
          title="Attachments coming soon"
        >
          <Paperclip className="h-4 w-4" />
        </button>
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleInput}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={placeholder || "Ask Flow³ anything about your workspace..."}
          className="max-h-[200px] min-h-[24px] flex-1 resize-none bg-transparent py-1.5 text-sm text-zinc-900 outline-none placeholder:text-zinc-400 dark:text-zinc-100 dark:placeholder:text-zinc-500"
          disabled={disabled}
        />
        {isStreaming ? (
          <button
            type="button"
            onClick={onStop}
            className="mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            aria-label="Stop generating"
          >
            <Square className="h-3.5 w-3.5 fill-current" />
          </button>
        ) : (
          <button
            type="button"
            onClick={submit}
            disabled={!value.trim() || disabled}
            className={cn(
              "mb-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-all",
              value.trim() && !disabled
                ? "bg-violet-600 text-white hover:bg-violet-700"
                : "bg-zinc-100 text-zinc-400 dark:bg-zinc-800 dark:text-zinc-600"
            )}
            aria-label="Send message"
          >
            <ArrowUp className="h-4 w-4" />
          </button>
        )}
      </div>
      <p className="mt-1.5 text-center text-[11px] text-zinc-400 dark:text-zinc-600">
        Flow³ can make mistakes. Verify important information.
      </p>
    </div>
  );
}