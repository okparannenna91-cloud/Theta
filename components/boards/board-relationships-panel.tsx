"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Link2, Unlink, GitBranch, Columns3, ArrowRight, ArrowLeft,
  ArrowUpDown, Plus, Trash2, Search, Globe, Database,
  LayoutGrid, Workflow, RefreshCcw, Eye
} from "lucide-react";

interface BoardRelationshipsPanelProps {
  workspaceId: string;
  boardId: string;
}

interface ConnectedBoard {
  id: string;
  boardId: string;
  linkedBoardId: string;
  relationshipType: "sync" | "mirror" | "dependency" | "lookup";
  direction: "oneWay" | "twoWay";
  linkedBoardName: string;
  linkedBoardColor: string;
  fieldMapping: Record<string, string>;
  active: boolean;
}

interface BoardItem {
  id: string;
  name: string;
  color: string;
}

const RELATIONSHIP_TYPES = [
  { id: "sync", label: "Sync Board", icon: RefreshCcw, desc: "Real-time data sync between boards", color: "text-blue-500" },
  { id: "mirror", label: "Mirror Column", icon: Eye, desc: "Display a column from another board", color: "text-purple-500" },
  { id: "dependency", label: "Dependencies", icon: GitBranch, desc: "Link tasks across boards", color: "text-amber-500" },
  { id: "lookup", label: "Lookup", icon: Search, desc: "Reference data from another board", color: "text-emerald-500" },
];

export default function BoardRelationshipsPanel({ workspaceId, boardId }: BoardRelationshipsPanelProps) {
  const [showConnect, setShowConnect] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeType, setActiveType] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const [formState, setFormState] = useState({
    linkedBoardId: "", relationshipType: "sync", direction: "oneWay", active: true,
    fieldMapping: "{}",
  });

  const { data: connections } = useQuery({
    queryKey: ["board-connections", boardId],
    queryFn: async () => {
      const res = await fetch(`/api/boards/${boardId}/connections`);
      if (!res.ok) throw new Error("Failed to fetch connections");
      return res.json();
    },
    enabled: !!boardId,
  });

  const { data: allBoards } = useQuery({
    queryKey: ["workspace-boards", workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/boards`);
      if (!res.ok) throw new Error("Failed to fetch boards");
      return res.json();
    },
    enabled: !!workspaceId,
  });

  const connList: ConnectedBoard[] = Array.isArray(connections) ? connections : [];
  const boards: BoardItem[] = Array.isArray(allBoards) ? allBoards.filter((b: BoardItem) => b.id !== boardId) : [];

  const filteredConnections = connList.filter(c => {
    if (activeType && c.relationshipType !== activeType) return false;
    return true;
  });

  const connectMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch(`/api/boards/${boardId}/connections`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Failed to create connection");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-connections"] });
      setShowConnect(false);
      toast.success("Board connected");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const removeMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/board-connections/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to remove connection");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["board-connections"] });
      toast.success("Connection removed");
    },
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Link2 className="h-5 w-5 text-blue-500" />
              Board Relationships
            </h3>
            <p className="text-xs text-muted-foreground">
              {connList.length} connection{connList.length !== 1 ? "s" : ""}
            </p>
          </div>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setShowConnect(true)}>
            <Plus className="h-3 w-3" /> Connect
          </Button>
        </div>
      </div>

      <div className="flex gap-1 p-3 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
        <button
          onClick={() => setActiveType(null)}
          className={cn(
            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all whitespace-nowrap",
            !activeType ? "bg-primary text-white" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
          )}
        >
          <LayoutGrid className="h-3 w-3" /> All ({connList.length})
        </button>
        {RELATIONSHIP_TYPES.map(type => {
          const Icon = type.icon;
          const count = connList.filter(c => c.relationshipType === type.id).length;
          return (
            <button
              key={type.id}
              onClick={() => setActiveType(type.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all whitespace-nowrap",
                activeType === type.id ? "bg-primary text-white" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              )}
            >
              <Icon className={cn("h-3 w-3", type.color)} /> {type.label} ({count})
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {filteredConnections.length === 0 ? (
          <div className="py-16 text-center text-slate-400">
            <Link2 className="h-12 w-12 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No connections yet</p>
            <p className="text-xs mt-1">Connect boards to sync, mirror, or create dependencies</p>
          </div>
        ) : (
          filteredConnections.map((conn, i) => {
            const typeInfo = RELATIONSHIP_TYPES.find(t => t.id === conn.relationshipType);
            const Icon = typeInfo?.icon || Link2;
            return (
              <Card key={conn.id} className={cn("border shadow-sm", !conn.active && "opacity-50")}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className={cn("h-3.5 w-3.5", typeInfo?.color)} />
                        <h4 className="text-xs font-semibold truncate">{conn.linkedBoardName}</h4>
                        <Badge variant="outline" className="text-[8px] px-1.5 py-0 h-4">
                          {conn.relationshipType}
                        </Badge>
                        <Badge variant="secondary" className="text-[8px] px-1.5 py-0 h-4">
                          {conn.direction === "oneWay" ? "One-way" : "Two-way"}
                        </Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        {typeInfo?.desc} &middot; {conn.direction === "oneWay" ? "Source → Target" : "Bidirectional"}
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <Switch
                        checked={conn.active}
                        className="scale-75"
                        onCheckedChange={() => {/* toggle mutation */}}
                      />
                      <Button
                        variant="ghost" size="icon" className="h-6 w-6"
                        onClick={() => removeMutation.mutate(conn.id)}
                      >
                        <Trash2 className="h-3 w-3 text-slate-400" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>

      {/* Connect Dialog */}
      {showConnect && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowConnect(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-bold mb-1">Connect Board</h3>
            <p className="text-xs text-muted-foreground mb-5">Link this board to another board in the workspace</p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500">Target Board</Label>
                <Select
                  value={formState.linkedBoardId}
                  onValueChange={(v) => setFormState(f => ({ ...f, linkedBoardId: v }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select a board..." />
                  </SelectTrigger>
                  <SelectContent>
                    {boards.map((b: any) => (
                      <SelectItem key={b.id} value={b.id} className="text-xs">{b.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500">Relationship Type</Label>
                <div className="grid grid-cols-2 gap-2">
                  {RELATIONSHIP_TYPES.map(type => {
                    const Icon = type.icon;
                    const isSelected = formState.relationshipType === type.id;
                    return (
                      <button
                        key={type.id}
                        onClick={() => setFormState(f => ({ ...f, relationshipType: type.id }))}
                        className={cn(
                          "flex flex-col items-center gap-2 p-4 rounded-xl border text-center transition-all",
                          isSelected
                            ? "border-primary bg-muted dark:bg-primary/10"
                            : "border-slate-200 dark:border-slate-700 hover:border-slate-300"
                        )}
                      >
                        <Icon className={cn("h-5 w-5", type.color)} />
                        <span className="text-[10px] font-bold">{type.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500">Direction</Label>
                <Select
                  value={formState.direction}
                  onValueChange={(v) => setFormState(f => ({ ...f, direction: v as "oneWay" | "twoWay" }))}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="oneWay" className="text-xs">One-way (source → target)</SelectItem>
                    <SelectItem value="twoWay" className="text-xs">Two-way (bidirectional)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6 pt-4 border-t">
              <Button variant="outline" onClick={() => setShowConnect(false)} size="sm">Cancel</Button>
              <Button
                size="sm"
                disabled={!formState.linkedBoardId || connectMutation.isPending}
                onClick={() => connectMutation.mutate(formState)}
              >
                {connectMutation.isPending ? "Connecting..." : "Connect Board"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
