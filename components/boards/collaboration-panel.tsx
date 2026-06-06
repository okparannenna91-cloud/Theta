"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import {
  Users, MessageSquare, Bell, Activity, FileText, Shield,
  Eye, Lock, Globe, UserPlus, Share2, Settings,
  AtSign, Clock, CheckCircle2, AlertCircle, Plus, X,
  Search, Filter, MoreHorizontal, Download, Sparkles
} from "lucide-react";

interface CollaborationPanelProps {
  workspaceId: string;
  boardId: string;
}

interface Collaborator {
  id: string;
  name: string;
  email: string;
  imageUrl: string | null;
  role: "owner" | "admin" | "editor" | "commenter" | "viewer";
  online: boolean;
  lastSeen: string;
}

interface CommentItem {
  id: string;
  content: string;
  createdAt: string;
  taskTitle: string;
  taskId: string;
  user: { id: string; name: string | null; imageUrl: string | null };
}

interface ActivityItem {
  id: string;
  type: string;
  description: string;
  createdAt: string;
  user: { id: string; name: string | null; imageUrl: string | null };
}

type TabId = "members" | "comments" | "activity" | "notifications" | "sharing" | "docs";

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: "members", label: "Members", icon: Users },
  { id: "comments", label: "Comments", icon: MessageSquare },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "notifications", label: "Notifications", icon: Bell },
  { id: "sharing", label: "Share", icon: Share2 },
  { id: "docs", label: "Docs", icon: FileText },
];

const ROLE_OPTIONS = [
  { value: "owner", label: "Owner", color: "text-amber-500" },
  { value: "admin", label: "Admin", color: "text-red-500" },
  { value: "editor", label: "Editor", color: "text-blue-500" },
  { value: "commenter", label: "Commenter", color: "text-purple-500" },
  { value: "viewer", label: "Viewer", color: "text-slate-500" },
];

const PERMISSION_PRESETS = [
  { id: "open", label: "Open", desc: "Anyone in workspace can edit", icon: Globe },
  { id: "restricted", label: "Restricted", desc: "Only specified roles", icon: Lock },
  { id: "viewOnly", label: "View Only", desc: "Read-only for everyone", icon: Eye },
  { id: "guest", label: "Guest Access", desc: "External sharing with view", icon: UserPlus },
];

export default function CollaborationPanel({ workspaceId, boardId }: CollaborationPanelProps) {
  const [activeTab, setActiveTab] = useState<TabId>("members");
  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const queryClient = useQueryClient();

  const { data: members } = useQuery({
    queryKey: ["collaborators", workspaceId, boardId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/members?boardId=${boardId}`);
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
    enabled: !!workspaceId,
  });

  const { data: recentComments } = useQuery({
    queryKey: ["recent-comments", boardId],
    queryFn: async () => {
      const res = await fetch(`/api/boards/${boardId}/comments/recent`);
      if (!res.ok) throw new Error("Failed to fetch recent comments");
      return res.json();
    },
    enabled: !!boardId,
  });

  const { data: recentActivity } = useQuery({
    queryKey: ["recent-activity", boardId],
    queryFn: async () => {
      const res = await fetch(`/api/boards/${boardId}/activity`);
      if (!res.ok) throw new Error("Failed to fetch activity");
      return res.json();
    },
    enabled: !!boardId,
  });

  const memberList: Collaborator[] = Array.isArray(members) ? members : [];
  const commentList: CommentItem[] = Array.isArray(recentComments) ? recentComments : [];
  const activityList: ActivityItem[] = Array.isArray(recentActivity) ? recentActivity : [];

  const onlineCount = memberList.filter(m => m.online).length;

  const updateRoleMutation = useMutation({
    mutationFn: async ({ memberId, role }: { memberId: string; role: string }) => {
      const res = await fetch(`/api/workspaces/${workspaceId}/members/${memberId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      if (!res.ok) throw new Error("Failed to update role");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["collaborators"] });
      toast.success("Role updated");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const inviteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/workspaces/${workspaceId}/invite`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole, boardId }),
      });
      if (!res.ok) throw new Error("Failed to invite");
      return res.json();
    },
    onSuccess: () => {
      setShowInvite(false);
      setInviteEmail("");
      toast.success("Invitation sent");
    },
    onError: (err: any) => toast.error(err.message),
  });

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Collaboration
            </h3>
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {onlineCount} online &middot; {memberList.length} total
            </p>
          </div>
          <Button size="sm" className="h-8 text-xs gap-1.5" onClick={() => setShowInvite(true)}>
            <UserPlus className="h-3 w-3" /> Invite
          </Button>
        </div>
      </div>

      <div className="flex gap-1 p-3 border-b border-slate-100 dark:border-slate-800 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-bold transition-all whitespace-nowrap",
                isActive ? "bg-primary text-white" : "text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              )}
            >
              <Icon className="h-3 w-3" /> {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 overflow-auto">
        {activeTab === "members" && (
          <div className="p-4 space-y-2">
            {memberList.map((member) => {
              const roleOpt = ROLE_OPTIONS.find(r => r.value === member.role);
              return (
                <Card key={member.id} className="border shadow-sm">
                  <CardContent className="p-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={member.imageUrl || ""} />
                          <AvatarFallback className="text-[10px]">{member.name?.charAt(0) || "?"}</AvatarFallback>
                        </Avatar>
                        {member.online && (
                          <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-white dark:border-slate-900" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold truncate">{member.name || "Unnamed"}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{member.email}</p>
                      </div>
                      <Select
                        defaultValue={member.role}
                        onValueChange={(v) => updateRoleMutation.mutate({ memberId: member.id, role: v })}
                      >
                        <SelectTrigger className={cn("h-7 text-[10px] w-24", roleOpt?.color)}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map(r => (
                            <SelectItem key={r.value} value={r.value} className={cn("text-[10px]", r.color)}>
                              {r.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
            {memberList.length === 0 && (
              <div className="py-16 text-center text-slate-400">
                <Users className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No members loaded</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "comments" && (
          <div className="p-4 space-y-3">
            {commentList.map((c) => (
              <Card key={c.id} className="border shadow-sm">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <Avatar className="h-6 w-6 mt-0.5">
                      <AvatarImage src={c.user.imageUrl || ""} />
                      <AvatarFallback className="text-[8px]">{c.user.name?.charAt(0) || "?"}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="text-[10px] font-semibold">{c.user.name || "Unknown"}</span>
                        <span className="text-[9px] text-muted-foreground">
                          {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-600 dark:text-slate-400 line-clamp-2">{c.content}</p>
                      <p className="text-[9px] text-muted-foreground mt-1">on &ldquo;{c.taskTitle}&rdquo;</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
            {commentList.length === 0 && (
              <div className="py-16 text-center text-slate-400">
                <MessageSquare className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No comments yet</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "activity" && (
          <div className="p-4 space-y-2">
            {activityList.map((a) => (
              <div key={a.id} className="flex items-start gap-3 p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={a.user.imageUrl || ""} />
                  <AvatarFallback className="text-[8px]">{a.user.name?.charAt(0) || "?"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="text-[11px]">
                    <span className="font-semibold">{a.user.name || "Someone"}</span>{" "}
                    {a.description}
                  </p>
                  <p className="text-[9px] text-muted-foreground">
                    {formatDistanceToNow(new Date(a.createdAt), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))}
            {activityList.length === 0 && (
              <div className="py-16 text-center text-slate-400">
                <Activity className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="text-sm font-medium">No recent activity</p>
              </div>
            )}
          </div>
        )}

        {activeTab === "notifications" && (
          <div className="p-4">
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center gap-3 mb-4">
                  <Bell className="h-5 w-5 text-slate-400" />
                  <div>
                    <h4 className="text-xs font-semibold">Notification Preferences</h4>
                    <p className="text-[10px] text-muted-foreground">Configure how you get notified</p>
                  </div>
                </div>
                <div className="space-y-3">
                  {[
                    { label: "Task assigned to me", key: "assigned", checked: true },
                    { label: "Status changes", key: "status", checked: true },
                    { label: "Comments and mentions", key: "comments", checked: true },
                    { label: "Due date reminders", key: "dueDate", checked: true },
                    { label: "New team members", key: "newMember", checked: false },
                    { label: "Board access changes", key: "access", checked: false },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between py-1.5">
                      <span className="text-[11px]">{item.label}</span>
                      <Switch defaultChecked={item.checked} className="scale-75" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "sharing" && (
          <div className="p-4 space-y-3">
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <h4 className="text-xs font-semibold mb-3 flex items-center gap-2">
                  <Shield className="h-3.5 w-3.5 text-slate-400" />
                  Access & Permissions
                </h4>
                <div className="grid grid-cols-2 gap-2">
                  {PERMISSION_PRESETS.map(p => {
                    const Icon = p.icon;
                    return (
                      <button
                        key={p.id}
                        className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:border-primary/30 transition-all text-center"
                      >
                        <Icon className="h-4 w-4 text-slate-400" />
                        <span className="text-[10px] font-bold">{p.label}</span>
                        <span className="text-[8px] text-muted-foreground">{p.desc}</span>
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                <h4 className="text-xs font-semibold mb-2 flex items-center gap-2">
                  <Share2 className="h-3.5 w-3.5 text-slate-400" />
                  Shareable Link
                </h4>
                <div className="flex items-center gap-2">
                  <Input value={`${window.location.origin}/board/${boardId}`} readOnly className="h-8 text-[10px]" />
                  <Button variant="outline" size="sm" className="h-8 text-[10px]" onClick={() => {
                    navigator.clipboard.writeText(`${window.location.origin}/board/${boardId}`);
                    toast.success("Link copied");
                  }}>
                    Copy
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {activeTab === "docs" && (
          <div className="p-4">
            <Card className="border shadow-sm">
              <CardContent className="p-4 text-center py-12">
                <FileText className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">Team Docs</p>
                <p className="text-xs text-muted-foreground mt-1">Create and share documentation for this board</p>
                <Button size="sm" className="mt-4 h-8 text-xs">
                  <Plus className="h-3 w-3 mr-1" /> New Doc
                </Button>
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      {/* Invite Dialog */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowInvite(false)}>
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold">Invite People</h3>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setShowInvite(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mb-4">Add collaborators to this board</p>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500">Email Address</Label>
                <Input
                  placeholder="colleague@company.com"
                  value={inviteEmail}
                  onChange={e => setInviteEmail(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500">Role</Label>
                <Select value={inviteRole} onValueChange={setInviteRole}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ROLE_OPTIONS.map(r => (
                      <SelectItem key={r.value} value={r.value} className="text-xs">{r.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button
                className="w-full h-9 text-xs"
                disabled={!inviteEmail || inviteMutation.isPending}
                onClick={() => inviteMutation.mutate()}
              >
                {inviteMutation.isPending ? "Sending..." : "Send Invitation"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Switch(props: any) {
  const [checked, setChecked] = useState(props.defaultChecked ?? false);
  return (
    <button
      onClick={() => setChecked(!checked)}
      className={cn(
        "inline-flex h-4 w-7 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        checked ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"
      )}
    >
      <span className={cn(
        "pointer-events-none block h-3 w-3 rounded-full bg-white shadow-lg ring-0 transition-transform",
        checked ? "translate-x-3" : "translate-x-0"
      )} />
    </button>
  );
}

function Label({ children, className, ...props }: any) {
  return <label className={cn("block", className)} {...props}>{children}</label>;
}
