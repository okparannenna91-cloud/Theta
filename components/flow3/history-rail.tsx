"use client";

import React, { useState } from "react";
import { Plus, MessageSquare, Pin, PinOff, Trash2, Pencil, Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ConversationSummary {
  id: string;
  title: string;
  isPinned: boolean;
  lastMessageAt: string;
  createdAt: string;
}

interface HistoryRailProps {
  conversations: ConversationSummary[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
  onTogglePin: (id: string, isPinned: boolean) => void;
  isLoading?: boolean;
}

export function HistoryRail({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onRename,
  onDelete,
  onTogglePin,
  isLoading,
}: HistoryRailProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const startEdit = (conv: ConversationSummary) => {
    setEditingId(conv.id);
    setEditValue(conv.title);
  };

  const commitEdit = () => {
    if (editingId && editValue.trim()) {
      onRename(editingId, editValue.trim());
    }
    setEditingId(null);
  };

  const pinned = conversations.filter((c) => c.isPinned);
  const rest = conversations.filter((c) => !c.isPinned);

  const renderRow = (conv: ConversationSummary) => (
    <div
      key={conv.id}
      className={cn(
        "group flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm transition-colors",
        conv.id === activeId
          ? "bg-violet-100 text-violet-900 dark:bg-violet-900/30 dark:text-violet-100"
          : "text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800"
      )}
    >
      <MessageSquare className="h-3.5 w-3.5 shrink-0 opacity-60" />
      {editingId === conv.id ? (
        <>
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              if (e.key === "Escape") setEditingId(null);
            }}
            className="min-w-0 flex-1 rounded border border-violet-300 bg-white px-1 py-0.5 text-sm outline-none dark:border-violet-600 dark:bg-zinc-900"
          />
          <button onClick={commitEdit} className="rounded p-0.5 hover:text-green-600" aria-label="Save title">
            <Check className="h-3.5 w-3.5" />
          </button>
          <button onClick={() => setEditingId(null)} className="rounded p-0.5 hover:text-red-500" aria-label="Cancel rename">
            <X className="h-3.5 w-3.5" />
          </button>
        </>
      ) : (
        <>
          <button
            onClick={() => onSelect(conv.id)}
            className="min-w-0 flex-1 truncate text-left"
            title={conv.title}
          >
            {conv.title}
          </button>
          <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
            <button
              onClick={() => onTogglePin(conv.id, !conv.isPinned)}
              className="rounded p-1 hover:text-violet-600 dark:hover:text-violet-400"
              aria-label={conv.isPinned ? "Unpin conversation" : "Pin conversation"}
            >
              {conv.isPinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
            </button>
            <button
              onClick={() => startEdit(conv)}
              className="rounded p-1 hover:text-violet-600 dark:hover:text-violet-400"
              aria-label="Rename conversation"
            >
              <Pencil className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onDelete(conv.id)}
              className="rounded p-1 hover:text-red-500"
              aria-label="Delete conversation"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>
        </>
      )}
    </div>
  );

  return (
    <aside className="flex h-full w-full flex-col border-r border-zinc-200 bg-zinc-50 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="p-3">
        <button
          onClick={onNewChat}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-violet-700"
        >
          <Plus className="h-4 w-4" />
          New chat
        </button>
      </div>
      <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 pb-4">
        {isLoading && <p className="px-2 py-4 text-xs text-zinc-400">Loading chats...</p>}
        {!isLoading && conversations.length === 0 && (
          <p className="px-2 py-4 text-xs text-zinc-400">No conversations yet.</p>
        )}
        {pinned.length > 0 && (
          <>
            <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Pinned</p>
            {pinned.map(renderRow)}
          </>
        )}
        {rest.length > 0 && pinned.length > 0 && (
          <p className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-zinc-400">Recent</p>
        )}
        {rest.map(renderRow)}
      </nav>
    </aside>
  );
}