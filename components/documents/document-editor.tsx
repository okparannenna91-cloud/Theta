"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Save, ArrowLeft, Pin, Eye, Clock, Users, Trash2,
  MessageSquare, History, Globe, Lock, FileText,
  ChevronDown, Bold, Italic, Underline, List, ListOrdered,
  Code, Quote, Heading1, Heading2, Heading3
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Placeholder from "@tiptap/extension-placeholder";

interface DocumentEditorProps {
  documentId: string;
  onBack: () => void;
}

export function DocumentEditor({ documentId, onBack }: DocumentEditorProps) {
  const { activeWorkspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [hasChanges, setHasChanges] = useState(false);
  const [showVersions, setShowVersions] = useState(false);
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null);

  const { data: doc, isLoading } = useQuery({
    queryKey: ["document", documentId],
    queryFn: async () => {
      const res = await fetch(`/api/documents/${documentId}`);
      if (!res.ok) throw new Error("Failed to fetch document");
      return res.json();
    },
    enabled: !!documentId,
  });

  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({
        placeholder: "Start writing...",
      }),
    ],
    content: doc?.content || "",
    onUpdate: ({ editor }) => {
      setHasChanges(true);
    },
  });

  useEffect(() => {
    if (doc) {
      setTitle(doc.title);
      if (editor && !editor.isFocused) {
        const currentContent = editor.getHTML();
        if (currentContent !== (doc.content || "")) {
          editor.commands.setContent(doc.content || "");
        }
      }
      setHasChanges(false);
    }
  }, [doc, editor]);

  const saveMutation = useMutation({
    mutationFn: async (data: { title: string; content: string }) => {
      const res = await fetch(`/api/documents/${documentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to save");
      return res.json();
    },
    onSuccess: () => {
      setHasChanges(false);
      queryClient.invalidateQueries({ queryKey: ["document", documentId] });
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document saved");
    },
    onError: () => toast.error("Failed to save document"),
  });

  const handleSave = useCallback(() => {
    if (!editor) return;
    saveMutation.mutate({ title, content: editor.getHTML() });
  }, [title, editor, saveMutation]);

  const handleAutoSave = useCallback(() => {
    if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    autoSaveTimer.current = setTimeout(() => {
      if (hasChanges) handleSave();
    }, 3000);
  }, [hasChanges, handleSave]);

  useEffect(() => {
    if (hasChanges) handleAutoSave();
    return () => {
      if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current);
    };
  }, [hasChanges, handleAutoSave]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
  };

  const formatTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <FileText className="h-10 w-10 text-muted-foreground mb-4" />
        <p className="text-sm font-medium">Document not found</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={onBack}>Go back</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full" onKeyDown={handleKeyDown}>
      <div className="flex items-center justify-between gap-4 pb-3 border-b">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" className="h-8 w-8 flex-shrink-0" onClick={onBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg">{doc.emoji || "📄"}</span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0">
                  {doc.status || "DRAFT"}
                </Badge>
                {doc.visibility === "PUBLIC" && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0 bg-emerald-500/10 text-emerald-600">
                    <Globe className="h-2.5 w-2.5 mr-0.5" /> Public
                  </Badge>
                )}
                {doc.visibility === "PRIVATE" && (
                  <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 flex-shrink-0">
                    <Lock className="h-2.5 w-2.5 mr-0.5" /> Private
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {hasChanges && (
            <span className="text-[10px] text-muted-foreground">Unsaved changes</span>
          )}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={() => setShowVersions(!showVersions)}
          >
            <History className="h-3.5 w-3.5" /> History
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs gap-1.5"
            onClick={handleSave}
            disabled={!hasChanges || saveMutation.isPending}
          >
            <Save className="h-3.5 w-3.5" />
            {saveMutation.isPending ? "Saving..." : "Save"}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto py-6">
        <div className="max-w-3xl mx-auto">
          <input
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setHasChanges(true); }}
            className="w-full text-3xl font-bold bg-transparent border-none outline-none placeholder:text-muted-foreground/50 mb-2"
            placeholder="Untitled document"
          />

          <div className="flex items-center gap-4 text-xs text-muted-foreground mb-6">
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {doc.user?.name || "Unknown"}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {formatTimeAgo(doc.updatedAt)}
            </span>
            <span>{editor?.storage.characterCount?.characters?.() ?? editor?.getText().split(/\s+/).filter(Boolean).length ?? 0} words</span>
            <span className="flex items-center gap-1">
              <Eye className="h-3 w-3" />
              {doc.views || 0} views
            </span>
          </div>

          {editor && (
            <div className="flex items-center gap-1 mb-4 p-1 rounded-lg border bg-muted/30">
              <Button
                variant="ghost" size="sm"
                className={cn("h-7 px-2 text-xs", editor.isActive("bold") && "bg-muted")}
                onClick={() => editor.chain().focus().toggleBold().run()}
              >
                <Bold className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost" size="sm"
                className={cn("h-7 px-2 text-xs", editor.isActive("italic") && "bg-muted")}
                onClick={() => editor.chain().focus().toggleItalic().run()}
              >
                <Italic className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost" size="sm"
                className={cn("h-7 px-2 text-xs", editor.isActive("underline") && "bg-muted")}
                onClick={() => editor.chain().focus().toggleUnderline().run()}
              >
                <Underline className="h-3.5 w-3.5" />
              </Button>
              <div className="w-px h-4 bg-border" />
              <Button
                variant="ghost" size="sm"
                className={cn("h-7 px-2 text-xs", editor.isActive("heading", { level: 1 }) && "bg-muted")}
                onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
              >
                <Heading1 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost" size="sm"
                className={cn("h-7 px-2 text-xs", editor.isActive("heading", { level: 2 }) && "bg-muted")}
                onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
              >
                <Heading2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost" size="sm"
                className={cn("h-7 px-2 text-xs", editor.isActive("heading", { level: 3 }) && "bg-muted")}
                onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
              >
                <Heading3 className="h-3.5 w-3.5" />
              </Button>
              <div className="w-px h-4 bg-border" />
              <Button
                variant="ghost" size="sm"
                className={cn("h-7 px-2 text-xs", editor.isActive("bulletList") && "bg-muted")}
                onClick={() => editor.chain().focus().toggleBulletList().run()}
              >
                <List className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost" size="sm"
                className={cn("h-7 px-2 text-xs", editor.isActive("orderedList") && "bg-muted")}
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
              >
                <ListOrdered className="h-3.5 w-3.5" />
              </Button>
              <div className="w-px h-4 bg-border" />
              <Button
                variant="ghost" size="sm"
                className={cn("h-7 px-2 text-xs", editor.isActive("blockquote") && "bg-muted")}
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
              >
                <Quote className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant="ghost" size="sm"
                className={cn("h-7 px-2 text-xs", editor.isActive("codeBlock") && "bg-muted")}
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
              >
                <Code className="h-3.5 w-3.5" />
              </Button>
            </div>
          )}

          <div className="prose prose-sm dark:prose-invert max-w-none min-h-[400px]">
            <EditorContent editor={editor} />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-between text-[10px] text-muted-foreground py-2 border-t">
        <div className="flex items-center gap-3">
          <span>{editor?.getText().split(/\s+/).filter(Boolean).length ?? 0} words</span>
          <span>{editor?.getText().length ?? 0} characters</span>
        </div>
        {doc.lastEditedBy && (
          <span>Last edited by {doc.lastEditedBy.name || "Unknown"} {formatTimeAgo(doc.updatedAt)}</span>
        )}
      </div>
    </div>
  );
}
