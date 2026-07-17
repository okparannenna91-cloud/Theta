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
    <div className="p-3 sm:p-5 border-t border-slate-100 dark:border-slate-800 bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl shrink-0 flex flex-col gap-2 sm:gap-3">
      {attachedFiles.length > 0 && (
        <div className="flex flex-wrap gap-1.5 w-full">
          {attachedFiles.map((file, i) => (
            <div key={i} className="group relative flex items-center gap-1.5 px-2 py-1.5 bg-primary/5 border border-primary/10 rounded-lg text-[10px] font-medium text-primary">
              <Paperclip className="w-2.5 h-2.5" />
              <span className="truncate max-w-[80px]">{file.name}</span>
              <button onClick={() => setAttachedFiles((prev) => prev.filter((_, idx) => idx !== i))} className="ml-1 text-rose-500 hover:text-rose-600">
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
        className="flex w-full items-end gap-2 relative"
      >
        <div className="flex items-center gap-1 bg-slate-100/50 dark:bg-slate-900/50 p-1 rounded-xl shrink-0">
          <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} multiple />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-8 w-8 sm:h-9 sm:w-9 rounded-lg text-slate-400 hover:text-primary hover:bg-white/80 dark:hover:bg-slate-800 transition-all"
            onClick={() => fileInputRef.current?.click()}
          >
            <Paperclip className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              "h-8 w-8 sm:h-9 sm:w-9 rounded-lg transition-all",
              isListening ? "text-rose-500 bg-rose-500/10" : "text-slate-400 hover:text-primary hover:bg-white/80 dark:hover:bg-slate-800"
            )}
            onClick={startListening}
          >
            <Mic className="h-3.5 w-3.5" />
          </Button>
        </div>

        <div className="relative flex-1 min-w-0">
          <textarea
            ref={inputRef}
            placeholder={isLimitReached ? "Limit reached" : "Ask Nova... (/ for commands)"}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              setShowSlashMenu(e.target.value === "/");
            }}
            onKeyDown={handleKeyDown}
            rows={1}
            className="w-full pr-10 bg-slate-100/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 focus-visible:border-primary/50 focus-visible:ring-0 text-sm font-medium rounded-xl resize-none overflow-hidden py-2.5 px-3.5 min-h-[40px] max-h-[120px] transition-all outline-none"
            disabled={isLoading || isLimitReached}
          />
          {showSlashMenu && (
            <div className="absolute bottom-full mb-1 left-0 right-0 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden z-50">
              {SLASH_COMMANDS.map((cmd) => (
                <button
                  key={cmd.command}
                  type="button"
                  onClick={() => handleSlashCommand(cmd.command)}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-primary/5 hover:text-primary transition-all border-b border-slate-100 dark:border-slate-800 last:border-b-0"
                >
                  <cmd.icon className="w-4 h-4 text-primary" />
                  <div>
                    <span className="font-semibold">{cmd.label}</span>
                    <span className="text-[10px] text-muted-foreground ml-2">{cmd.description}</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <Button
          type="submit"
          size="icon"
          disabled={(!input.trim() && attachedFiles.length === 0) || isLoading || isLimitReached}
          className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-primary hover:bg-primary/90 text-white shadow-sm transition-all active:scale-95 shrink-0"
        >
          <Send className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </Button>
      </form>
    </div>
  );
}
