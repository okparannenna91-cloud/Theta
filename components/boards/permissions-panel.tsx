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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import {
  Shield, Lock, Globe, Eye, EyeOff, Users, UserPlus,
  Settings, Key, Share2, Link, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronRight, Columns3, FileText, ListChecks
} from "lucide-react";

interface PermissionsPanelProps {
  workspaceId: string;
  boardId: string;
}

type PermissionLevel = "full" | "edit" | "comment" | "view" | "none";

interface ColumnPermission {
  columnId: string;
  columnName: string;
  columnType: string;
  permission: PermissionLevel;
}

interface BoardPermission {
  visibility: "private" | "team" | "public";
  defaultRole: "editor" | "commenter" | "viewer";
  allowGuestAccess: boolean;
  shareableLink: boolean;
  linkPermission: PermissionLevel;
}

const PERMISSION_LEVELS: { value: PermissionLevel; label: string; color: string; desc: string }[] = [
  { value: "full", label: "Full Access", color: "text-emerald-500", desc: "Can edit, delete, manage" },
  { value: "edit", label: "Can Edit", color: "text-blue-500", desc: "Can create and edit items" },
  { value: "comment", label: "Can Comment", color: "text-purple-500", desc: "Can view and comment" },
  { value: "view", label: "Can View", color: "text-slate-500", desc: "Read-only access" },
  { value: "none", label: "No Access", color: "text-red-500", desc: "Hidden from user" },
];

const ROLE_BADGES: Record<string, { label: string; color: string }> = {
  owner: { label: "Owner", color: "bg-amber-500/10 text-amber-600 border-amber-200" },
  admin: { label: "Admin", color: "bg-red-500/10 text-red-600 border-red-200" },
  editor: { label: "Editor", color: "bg-blue-500/10 text-blue-600 border-blue-200" },
  commenter: { label: "Commenter", color: "bg-purple-500/10 text-purple-600 border-purple-200" },
  viewer: { label: "Viewer", color: "bg-slate-500/10 text-slate-600 border-slate-200" },
};

const DEFAULT_COLUMNS: ColumnPermission[] = [
  { columnId: "col-1", columnName: "Status", columnType: "status", permission: "full" },
  { columnId: "col-2", columnName: "Assignee", columnType: "people", permission: "full" },
  { columnId: "col-3", columnName: "Priority", columnType: "priority", permission: "full" },
  { columnId: "col-4", columnName: "Due Date", columnType: "date", permission: "edit" },
  { columnId: "col-5", columnName: "Confidential Notes", columnType: "text", permission: "view" },
];

export default function PermissionsPanel({ workspaceId, boardId }: PermissionsPanelProps) {
  const [activeTab, setActiveTab] = useState<"board" | "columns" | "items" | "sharing">("board");
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    "board-permissions": true,
    "column-permissions": false,
    "item-permissions": false,
    "share-link": false,
    "guest-access": false,
  });
  const queryClient = useQueryClient();

  const [boardPerm, setBoardPerm] = useState<BoardPermission>({
    visibility: "team",
    defaultRole: "editor",
    allowGuestAccess: false,
    shareableLink: false,
    linkPermission: "view",
  });

  const [columnPerms, setColumnPerms] = useState<ColumnPermission[]>(DEFAULT_COLUMNS);

  const { data: members } = useQuery({
    queryKey: ["collaborators", workspaceId, boardId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/members?boardId=${boardId}`);
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
  });

  const { data: board } = useQuery({
    queryKey: ["board", boardId],
    queryFn: async () => {
      const res = await fetch(`/api/boards/${boardId}`);
      if (!res.ok) throw new Error("Failed to fetch board");
      return res.json();
    },
  });

  const memberList: any[] = Array.isArray(members) ? members : [];
  const columns = board?.columns || [];

  const toggleSection = (key: string) => {
    setExpandedSections(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const updateColumnPermission = (columnId: string, permission: PermissionLevel) => {
    setColumnPerms(prev => prev.map(c => c.columnId === columnId ? { ...c, permission } : c));
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Shield className="h-5 w-5 text-emerald-500" />
              Security & Permissions
            </h3>
            <p className="text-xs text-muted-foreground">
              Manage access for {memberList.length} members across {columns.length} columns
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-1 p-3 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
        {[
          { id: "board" as const, label: "Board", icon: Shield },
          { id: "columns" as const, label: "Columns", icon: Columns3 },
          { id: "items" as const, label: "Items", icon: ListChecks },
          { id: "sharing" as const, label: "Sharing", icon: Share2 },
        ].map(tab => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all whitespace-nowrap",
                activeTab === tab.id ? "bg-primary text-white" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              )}
            >
              <Icon className="h-3 w-3" /> {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {activeTab === "board" && (
          <div className="space-y-4">
            <Card className="border shadow-sm">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Globe className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-semibold">Board Visibility</span>
                  </div>
                  <Select
                    value={boardPerm.visibility}
                    onValueChange={(v: any) => setBoardPerm(p => ({ ...p, visibility: v }))}
                  >
                    <SelectTrigger className="h-7 w-28 text-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="private" className="text-xs">
                        <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Private</span>
                      </SelectItem>
                      <SelectItem value="team" className="text-xs">
                        <span className="flex items-center gap-1"><Users className="h-3 w-3" /> Team</span>
                      </SelectItem>
                      <SelectItem value="public" className="text-xs">
                        <span className="flex items-center gap-1"><Globe className="h-3 w-3" /> Public</span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-slate-400" />
                    <span className="text-xs font-semibold">Default Member Role</span>
                  </div>
                  <Select
                    value={boardPerm.defaultRole}
                    onValueChange={(v: any) => setBoardPerm(p => ({ ...p, defaultRole: v }))}
                  >
                    <SelectTrigger className="h-7 w-28 text-[10px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor" className="text-xs">Editor</SelectItem>
                      <SelectItem value="commenter" className="text-xs">Commenter</SelectItem>
                      <SelectItem value="viewer" className="text-xs">Viewer</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <UserPlus className="h-4 w-4 text-slate-400" />
                    <div>
                      <span className="text-xs font-semibold">Guest Access</span>
                      <p className="text-[9px] text-muted-foreground">Allow external users with limited access</p>
                    </div>
                  </div>
                  <Switch
                    checked={boardPerm.allowGuestAccess}
                    onCheckedChange={(v) => setBoardPerm(p => ({ ...p, allowGuestAccess: v }))}
                  />
                </div>
              </CardContent>
            </Card>

            <h4 className="text-xs font-bold text-slate-500 px-1">Member Roles</h4>
            {memberList.map((member: any) => {
              const roleBadge = ROLE_BADGES[member.role] || ROLE_BADGES.viewer;
              return (
                <Card key={member.id} className="border shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-xs font-bold">
                          {member.name?.charAt(0) || "?"}
                        </div>
                        <div>
                          <p className="text-xs font-semibold">{member.name || "Unnamed"}</p>
                          <p className="text-[9px] text-muted-foreground">{member.email}</p>
                        </div>
                      </div>
                      <Badge className={cn("text-[8px] font-bold border", roleBadge.color)}>
                        {roleBadge.label}
                      </Badge>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {activeTab === "columns" && (
          <div className="space-y-3">
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Columns3 className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-semibold">Column-Level Permissions</span>
                  <p className="text-[9px] text-muted-foreground ml-auto">Control who can see/edit each column</p>
                </div>
                <div className="space-y-2">
                  {columns.length > 0 ? columns.map((col: any) => {
                    const colPerm = columnPerms.find(c => c.columnId === col.id);
                    const level = colPerm?.permission || "full";
                    const levelInfo = PERMISSION_LEVELS.find(l => l.value === level);
                    return (
                      <div key={col.id} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                        <div className="flex items-center gap-2">
                          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: col.color || "#6366f1" }} />
                          <span className="text-xs font-medium">{col.name}</span>
                          <Badge variant="outline" className="text-[7px] px-1.5 h-4">{col.columnType || "text"}</Badge>
                        </div>
                        <Select
                          value={level}
                          onValueChange={(v: any) => updateColumnPermission(col.id, v)}
                        >
                          <SelectTrigger className={cn("h-7 w-24 text-[9px]", levelInfo?.color)}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {PERMISSION_LEVELS.map(l => (
                              <SelectItem key={l.value} value={l.value} className="text-[10px]">
                                {l.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    );
                  }) : (
                    DEFAULT_COLUMNS.map((col) => {
                      const levelInfo = PERMISSION_LEVELS.find(l => l.value === col.permission);
                      return (
                        <div key={col.columnId} className="flex items-center justify-between py-2 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-2 rounded-full bg-primary" />
                            <span className="text-xs font-medium">{col.columnName}</span>
                            <Badge variant="outline" className="text-[7px] px-1.5 h-4">{col.columnType}</Badge>
                          </div>
                          <Select
                            value={col.permission}
                            onValueChange={(v: any) => updateColumnPermission(col.columnId, v)}
                          >
                            <SelectTrigger className={cn("h-7 w-24 text-[9px]", levelInfo?.color)}>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {PERMISSION_LEVELS.map(l => (
                                <SelectItem key={l.value} value={l.value} className="text-[10px]">
                                  {l.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "items" && (
          <div className="space-y-4">
            <Card className="border shadow-sm">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center gap-2">
                  <ListChecks className="h-4 w-4 text-slate-400" />
                  <span className="text-xs font-semibold">Item-Level Permissions</span>
                </div>

                {[
                  { label: "Allow item-level restrictions", key: "itemRestrict", desc: "Override column permissions per item", enabled: false },
                  { label: "Restrict delete to owner/admin", key: "deleteRestrict", desc: "Only item creator or admins can delete", enabled: true },
                  { label: "Restrict edit to owner/admin", key: "editRestrict", desc: "Only item creator or admins can edit", enabled: false },
                  { label: "Enable approval for edits", key: "approvalEdit", desc: "Edits require approval", enabled: false },
                ].map((item) => (
                  <div key={item.key} className="flex items-center justify-between py-1">
                    <div>
                      <span className="text-xs font-medium">{item.label}</span>
                      <p className="text-[9px] text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch checked={item.enabled} />
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "sharing" && (
          <div className="space-y-4">
            <Card className="border shadow-sm">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Link className="h-4 w-4 text-slate-400" />
                    <div>
                      <span className="text-xs font-semibold">Shareable Link</span>
                      <p className="text-[9px] text-muted-foreground">Create a link to share this board</p>
                    </div>
                  </div>
                  <Switch
                    checked={boardPerm.shareableLink}
                    onCheckedChange={(v) => setBoardPerm(p => ({ ...p, shareableLink: v }))}
                  />
                </div>
                {boardPerm.shareableLink && (
                  <>
                    <div className="flex items-center gap-2">
                      <Input
                        value={`${typeof window !== "undefined" ? window.location.origin : ""}/share/${boardId}`}
                        readOnly
                        className="h-8 text-[10px] flex-1"
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-[10px]"
                        onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/share/${boardId}`);
                          toast.success("Link copied");
                        }}
                      >
                        Copy
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-medium">Link permission</span>
                      <Select
                        value={boardPerm.linkPermission}
                        onValueChange={(v: any) => setBoardPerm(p => ({ ...p, linkPermission: v }))}
                      >
                        <SelectTrigger className="h-7 w-28 text-[10px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="edit" className="text-xs">Can Edit</SelectItem>
                          <SelectItem value="comment" className="text-xs">Can Comment</SelectItem>
                          <SelectItem value="view" className="text-xs">Can View</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border shadow-sm">
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-500" />
                  <span className="text-xs font-semibold">Sensitive Actions</span>
                </div>
                {[
                  { action: "Delete board", restricted: true, to: "Owner only" },
                  { action: "Manage members", restricted: true, to: "Owner/Admin" },
                  { action: "Change permissions", restricted: true, to: "Owner/Admin" },
                  { action: "Export data", restricted: false, to: "Admins & Editors" },
                  { action: "Delete items", restricted: false, to: "Admins & Editors" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <span className="text-[10px] font-medium">{item.action}</span>
                    <div className="flex items-center gap-2">
                      {item.restricted ? (
                        <Lock className="h-3 w-3 text-amber-500" />
                      ) : (
                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                      )}
                      <span className="text-[9px] text-slate-500">{item.to}</span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
