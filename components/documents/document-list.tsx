"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FileText, Plus, Search, Pin, Clock, Eye, Trash2, MoreHorizontal,
  FolderOpen, Hash, ArrowUpDown, Filter
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

interface DocumentListProps {
  projectId?: string;
  onSelectDocument?: (docId: string) => void;
  selectedDocumentId?: string;
}

export function DocumentList({ projectId, onSelectDocument, selectedDocumentId }: DocumentListProps) {
  const { activeWorkspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<"updatedAt" | "title" | "views">("updatedAt");

  const { data, isLoading } = useQuery({
    queryKey: ["documents", activeWorkspaceId, projectId],
    queryFn: async () => {
      const params = new URLSearchParams({ workspaceId: activeWorkspaceId! });
      if (projectId) params.set("projectId", projectId);
      const res = await fetch(`/api/documents?${params}`);
      if (!res.ok) throw new Error("Failed to fetch documents");
      return res.json();
    },
    enabled: !!activeWorkspaceId,
  });

  const deleteMutation = useMutation({
    mutationFn: async (docId: string) => {
      const res = await fetch(`/api/documents/${docId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document archived");
    },
    onError: () => toast.error("Failed to delete document"),
  });

  const documents = (data?.documents || [])
    .filter((doc: any) => {
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return doc.title.toLowerCase().includes(q) || (doc.content || "").toLowerCase().includes(q);
      }
      return true;
    })
    .filter((doc: any) => {
      if (statusFilter === "all") return true;
      return doc.status === statusFilter.toUpperCase();
    })
    .sort((a: any, b: any) => {
      if (sortBy === "updatedAt") return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      if (sortBy === "title") return a.title.localeCompare(b.title);
      if (sortBy === "views") return (b.views || 0) - (a.views || 0);
      return 0;
    });

  const formatTimeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const wordCount = (html: string | null) => {
    if (!html) return 0;
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().split(" ").length;
  };

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-lg" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search documents..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs"
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs">
              <Filter className="h-3 w-3" />
              {statusFilter === "all" ? "All" : statusFilter}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {["all", "draft", "published", "archived"].map((s) => (
              <DropdownMenuItem key={s} onClick={() => setStatusFilter(s)}>
                <span className="capitalize">{s}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-1.5 text-xs"
          onClick={() => setSortBy(sortBy === "updatedAt" ? "title" : sortBy === "title" ? "views" : "updatedAt")}
        >
          <ArrowUpDown className="h-3 w-3" />
          {sortBy === "updatedAt" ? "Recent" : sortBy === "title" ? "A-Z" : "Views"}
        </Button>
      </div>

      {documents.length === 0 ? (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center py-10 text-center">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center mb-3">
              <FileText className="h-5 w-5 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium mb-1">
              {searchQuery ? "No matching documents" : "No documents yet"}
            </p>
            <p className="text-xs text-muted-foreground">
              {searchQuery ? "Try a different search" : "Create your first document to get started"}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-1">
          {documents.map((doc: any) => (
            <button
              key={doc.id}
              onClick={() => onSelectDocument?.(doc.id)}
              className={cn(
                "w-full flex items-start gap-3 p-3 rounded-lg text-left transition-all group",
                selectedDocumentId === doc.id
                  ? "bg-primary/10 border border-primary/20"
                  : "hover:bg-muted/50 border border-transparent"
              )}
            >
              <div className="w-8 h-8 rounded-md bg-muted flex items-center justify-center text-base flex-shrink-0 mt-0.5">
                {doc.emoji || "📄"}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{doc.title}</span>
                  {doc.isPinned && <Pin className="h-3 w-3 text-amber-500 flex-shrink-0" />}
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatTimeAgo(doc.updatedAt)}
                  </span>
                  <span>{wordCount(doc.content)} words</span>
                  <span className="flex items-center gap-1">
                    <Eye className="h-3 w-3" />
                    {doc.views || 0}
                  </span>
                  {doc.status && doc.status !== "PUBLISHED" && (
                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4">
                      {doc.status}
                    </Badge>
                  )}
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <MoreHorizontal className="h-3.5 w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onSelectDocument?.(doc.id); }}>
                    <FileText className="h-3.5 w-3.5 mr-2" /> Open
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(e) => { e.stopPropagation(); deleteMutation.mutate(doc.id); }}
                    className="text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-2" /> Archive
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
