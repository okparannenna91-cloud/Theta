"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sparkles, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AIInlineButtonProps {
  workspaceId: string;
  context: string;
  type?: "description" | "reply" | "summary" | "status" | "risk";
  onResult: (text: string) => void;
  className?: string;
  size?: "sm" | "default";
}

const PROMPTS: Record<string, string> = {
  description: "Write a clear, professional task description based on this context. Be concise and actionable.",
  reply: "Suggest a contextual reply to this message. Be helpful and professional.",
  summary: "Generate a concise summary of this sprint/project progress. Include key metrics and highlights.",
  status: "Draft a status update for stakeholders based on this project data. Be clear and factual.",
  risk: "Analyze and summarize the risks for this project. List top risks with severity and mitigation suggestions.",
};

export function AIInlineButton({
  workspaceId,
  context,
  type = "description",
  onResult,
  className,
  size = "sm",
}: AIInlineButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClick = async () => {
    setLoading(true);
    setError(null);

    try {
      const prompt = PROMPTS[type] || PROMPTS.description;
      const fullPrompt = `${prompt}\n\nContext:\n${context}`;

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: fullPrompt,
          workspaceId,
        }),
      });

      if (!res.ok) throw new Error("AI request failed");

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No response stream");

      const decoder = new TextDecoder();
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n");

        for (const line of lines) {
          if (line.startsWith("event: token")) {
            const dataLine = lines[lines.indexOf(line) + 1];
            if (dataLine?.startsWith("data: ")) {
              fullResponse += dataLine.slice(6);
            }
          }
          if (line.startsWith("event: done")) {
            try {
              const dataLine = lines[lines.indexOf(line) + 1];
              if (dataLine?.startsWith("data: ")) {
                const parsed = JSON.parse(dataLine.slice(6));
                if (parsed.response) fullResponse = parsed.response;
              }
            } catch {}
          }
        }
      }

      if (fullResponse) {
        onResult(fullResponse);
        toast.success("AI generated content");
      }
    } catch (err: any) {
      setError(err.message);
      toast.error("AI generation failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant="ghost"
      size={size}
      className={cn(
        "gap-1.5 text-primary hover:text-primary/80",
        className
      )}
      onClick={handleClick}
      disabled={loading}
    >
      {loading ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <Sparkles className="h-3 w-3" />
      )}
      {loading ? "Generating..." : "Write with AI"}
    </Button>
  );
}
