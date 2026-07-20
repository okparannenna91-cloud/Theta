"use client";

import type { Message } from "./types";

export function exportConversation(messages: Message[], title?: string): string {
  const lines: string[] = [];
  lines.push(`# ${title || "Nova Conversation"}`);
  lines.push(`> Exported on ${new Date().toLocaleString()}`);
  lines.push("");

  for (const msg of messages) {
    const time = msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const role = msg.role === "nova" ? "**Nova**" : "**You**";
    lines.push(`### ${role} _${time}_`);
    lines.push("");
    lines.push(msg.content);
    lines.push("");
    if (msg.attachments && msg.attachments.length > 0) {
      lines.push(`Attachments: ${msg.attachments.map(f => f.name).join(", ")}`);
      lines.push("");
    }
  }

  return lines.join("\n");
}

export function downloadExport(content: string, filename?: string) {
  const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `nova-conversation-${new Date().toISOString().split("T")[0]}.md`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
