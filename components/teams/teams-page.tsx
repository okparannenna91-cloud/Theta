"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Users, UserPlus, Loader2, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { TeamDetails } from "./team-details";
import Image from "next/image";

import { useWorkspace } from "@/hooks/use-workspace";
import { usePopups } from "@/components/popups/popup-manager";

async function fetchTeams(workspaceId: string | null) {
  const url = workspaceId ? `/api/teams?workspaceId=${workspaceId}` : "/api/teams";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch teams");
  return res.json();
}

async function createTeam(data: { name: string; description?: string; workspaceId: string }) {
  const res = await fetch("/api/teams", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create team");
  return res.json();
}

async function sendInvite(data: { workspaceId: string; email: string; role: string }) {
  const res = await fetch("/api/invites", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) { const error = await res.json(); throw new Error(error.error || "Failed to send invite"); }
  return res.json();
}

export default function TeamsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [view, setView] = useState<"list" | "details">("list");
  const queryClient = useQueryClient();
  const { activeWorkspaceId } = useWorkspace();
  const { showUpgradePrompt } = usePopups();

  const { data: teamsData, isLoading } = useQuery({
    queryKey: ["teams", activeWorkspaceId],
    queryFn: () => fetchTeams(activeWorkspaceId),
    enabled: !!activeWorkspaceId,
  });

  const teams = Array.isArray(teamsData?.teams) ? teamsData.teams : Array.isArray(teamsData) ? teamsData : [];
  const teamLimits = teamsData?.limits || { max: -1, current: 0 };
  const memberLimits = teamsData?.memberLimits || { max: -1, current: 0 };
  const isTeamLimitReached = teamLimits.max !== -1 && teamLimits.current >= teamLimits.max;
  const isMemberLimitReached = memberLimits.max !== -1 && memberLimits.current >= memberLimits.max;

  const createMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) => createTeam({ ...data, workspaceId: activeWorkspaceId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", activeWorkspaceId] });
      setIsOpen(false); setName(""); setDescription("");
      toast.success("Team created successfully");
    },
    onError: (error: any) => { toast.error(error.message); }
  });

  const inviteMutation = useMutation({
    mutationFn: sendInvite,
    onSuccess: (data) => {
      setIsInviteOpen(false); setInviteEmail("");
      toast.success(`Invite sent successfully`);
    },
    onError: (error: any) => { toast.error(error.message); }
  });

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId) { toast.error("Workspace ID missing"); return; }
    if (isMemberLimitReached) { showUpgradePrompt("members"); return; }
    inviteMutation.mutate({ workspaceId: activeWorkspaceId, email: inviteEmail, role: inviteRole });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !activeWorkspaceId) return;
    if (isTeamLimitReached) { showUpgradePrompt("teams"); return; }
    createMutation.mutate({ name, description });
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (<Skeleton key={i} className="h-40 rounded-lg" />))}
        </div>
      </div>
    );
  }

  if (selectedTeam && view === "details") {
    return (
      <div>
        <TeamDetails team={selectedTeam} onBack={() => { setView("list"); setSelectedTeam(null); }} />
      </div>
    );
  }

  return (
    <div className="pb-10">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Teams</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Manage your workspace teams and collaboration groups
          </p>
        </div>
        <div className="flex items-center gap-3">
          {(teamLimits.max !== -1 || memberLimits.max !== -1) && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground">
              {teamLimits.max !== -1 && (
                <div className="flex items-center gap-2">
                  <span>Teams: {teamLimits.current}/{teamLimits.max}</span>
                  <div className="h-1 w-16 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(teamLimits.current / teamLimits.max) * 100}%` }} />
                  </div>
                </div>
              )}
              {memberLimits.max !== -1 && (
                <div className="flex items-center gap-2">
                  <span>Members: {memberLimits.current}/{memberLimits.max}</span>
                  <div className="h-1 w-16 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary" style={{ width: `${(memberLimits.current / memberLimits.max) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}
          <Button onClick={() => setIsOpen(true)} variant={isTeamLimitReached ? "outline" : "default"}>
            <Plus className="h-4 w-4 mr-2" /> New Team
          </Button>
        </div>
      </div>

      {teams?.length === 0 ? (
        <div className="text-center py-16 border rounded-lg">
          <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="text-sm font-semibold mb-2">No teams yet</h3>
          <p className="text-sm text-muted-foreground mb-4">Create your first team to start collaborating.</p>
          <Button onClick={() => setIsOpen(true)} variant="outline">
            <Plus className="h-4 w-4 mr-2" /> New Team
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams?.map((team: any) => (
            <Card key={team.id}
              onClick={() => { setSelectedTeam(team); setView("details"); }}
              className="border shadow-sm hover:border-primary/30 transition-colors cursor-pointer group">
              <CardContent className="p-5">
                <div className="flex items-center gap-4 mb-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                    <Users className="h-6 w-6 text-primary group-hover:text-primary-foreground transition-colors" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{team.name}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {team.userRole === "owner" || team.userRole === "admin" ? (
                        <span className="inline-flex items-center rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                          {team.userRole === "owner" ? "Owner" : "Admin"}
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">Member</span>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground line-clamp-2 mb-4 min-h-[32px]">
                  {team.description || "No description."}
                </p>
                <div className="flex items-center justify-between border-t pt-4">
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-2">
                      {team.members?.slice(0, 4).map((m: any) => (
                        <div key={m.userId}
                          className="h-8 w-8 rounded-full ring-2 ring-background bg-muted flex items-center justify-center text-xs font-medium overflow-hidden">
                          {m.user?.imageUrl ? (
                            <Image src={m.user.imageUrl} alt={m.user.name || "Member"} width={32} height={32} className="h-full w-full object-cover" />
                          ) : (m.user?.name?.[0] || "?")}
                        </div>
                      ))}
                      {(team.membersCount || 0) > 4 && (
                        <div className="h-8 w-8 rounded-full ring-2 ring-background bg-primary text-primary-foreground flex items-center justify-center text-[10px] font-medium">
                          +{team.membersCount - 4}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground">{team.membersCount || 1} members</span>
                  </div>
                  {(team.userRole === "admin" || team.userRole === "owner") && (
                    <Button variant="ghost" size="sm" className="h-8 text-xs"
                      onClick={(e) => { e.stopPropagation(); setSelectedTeam(team); setIsInviteOpen(true); }}>
                      <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Invite
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>New Team</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Team Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Engineering" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the team's purpose..." />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create Team"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Invite Member</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input id="email" type="email" placeholder="colleague@company.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role">Role</Label>
              <select id="role"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Invite"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
