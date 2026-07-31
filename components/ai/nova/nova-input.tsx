"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Paperclip, X, Mic } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { SLASH_COMMANDS } from "./types";

interface Props {
  input: string;
  setInput: (v: string) => void;
  onSend: () => void;
  isLoading: boolean;
  isLimitReached: boolean;
  onSlashCommand?: (command: string) => void;
}

export function NovaInput({ input, setInput, onSend, isLoading, isLimitReached, onSlashCommand }: Props) {
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [showSlashMenu, setShowSlashMenu] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = Math.min(inputRef.current.scrollHeight, 120) + "px";
    }
  }, [input]);

  const startListening = useCallback(() => {
    if (!("webkitSpeechRecognition" in window)) {
      toast.error("Speech recognition not supported in this browser.");
      return;
    }
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.lang = "en-US";
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      setInput(event.results[0][0].transcript);
    };
    recognition.start();
  }, [setInput]);

  const handleFileUpload = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) {
        const files = Array.from(e.target.files);
        setAttachedFiles((prev) => [...prev, ...files]);
        toast.success(`Attached ${files.length} file(s)`);
      }
    },
    []
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        onSend();
        return;
      }
      if (e.key === "/" && input === "") {
        setShowSlashMenu(true);
      }
    },
    [input, onSend]
  );

  const handleSlashCommand = useCallback(
    (command: string) => {
      setShowSlashMenu(false);
      if (command === "/clear") {
        onSlashCommand?.("/clear");
        return;
      }
      setInput(command);
      inputRef.current?.focus();
    },
    [setInput, onSlashCommand]
  );

  return (
    <div className="flex flex-col gap-2 shrink-0">
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 w-full">
          {attachedFiles.map((file, i) => (
            <div key={i} className="group relative flex items-center gap-1.5 px-2 py-1 bg-indigo-50 border border-indigo-200 text-indigo-700 rounded-lg text-[11px] font-medium">
              <Paperclip className="w-2.5 h-2.5" />
              <span className="truncate max-w-[80px]">{file.name}</span>
              <button onClick={() => setAttachedFiles((prev) => prev.filter((_, idx) => idx !== i))} className="ml-1 text-indigo-400 hover:text-red-500">
                <X className="w-2.5 h-2.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSend();
        }}
        className="flex w-full items-center gap-1.5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border border-slate-200/80 dark:border-slate-700/80 focus-within:border-indigo-400 dark:focus-within:border-indigo-500 focus-within:ring-2 focus-within:ring-indigo-100 dark:focus-within:ring-indigo-500/20 rounded-xl px-2 py-1.5 shadow-[0_1px_3px_rgba(0,0,0,0.05)] transition-all relative"
      >
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} multiple />
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="h-8 w-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shrink-0"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-4 w-4" />
        </Button>

        <div className="relative flex-1 min-w-0">
          <textarea
            ref={inputRef}
            data-nova-input
            placeholder={isLimitReached ? "Limit reached" : "Ask Nova anything..."}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setShowSlashMenu(e.target.value === "/");
            }}
            onKeyDown={handleKeyDown}
            rows={1}
            className="w-full bg-transparent border-none focus-visible:ring-0 focus-visible:outline-none text-sm font-medium rounded-lg resize-none overflow-hidden py-2 px-1.5 min-h-[36px] max-h-[120px] transition-all"
            disabled={isLoading || isLimitReached}
          />
          {showSlashMenu && (
            <div className="absolute bottom-full mb-1.5 left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-xl overflow-hidden z-50">
              {SLASH_COMMANDS.map((cmd) => (
                <button
                  key={cmd.command}
                  type="button"
                  onClick={() => handleSlashCommand(cmd.command)}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 hover:text-indigo-700 dark:hover:text-indigo-300 transition-all border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                >
                  <cmd.icon className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  <div>
                    <span className="font-semibold">{cmd.label}</span>
                    <span className="text-[11px] text-muted-foreground ml-2">{cmd.description}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="icon"
          className={cn(
            "h-8 w-8 rounded-lg transition-all shrink-0",
            isListening ? "text-red-500 bg-red-50 dark:bg-red-500/10" : "text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
          )}
          onClick={startListening}
          title="Talk to text"
        >
          <Mic className="h-4 w-4" />
        </Button>

        <Button
          type="submit"
          size="icon"
          disabled={(!input.trim() && attachedFiles.length === 0) || isLoading || isLimitReached}
          className="h-9 w-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all active:scale-95 shrink-0"
        >
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}
