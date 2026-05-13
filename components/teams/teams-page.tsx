"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Users, UserPlus, Link as LinkIcon, Loader2, ArrowLeft } from "lucide-react";
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
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create team");
  return res.json();
}

async function sendInvite(data: { workspaceId: string; email: string; role: string }) {
  const res = await fetch("/api/invites", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json();
    throw new Error(error.error || "Failed to send invite");
  }
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
    mutationFn: (data: { name: string; description?: string }) =>
      createTeam({ ...data, workspaceId: activeWorkspaceId! }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teams", activeWorkspaceId] });
      setIsOpen(false);
      setName("");
      setDescription("");
      toast.success("Team created successfully");
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const inviteMutation = useMutation({
    mutationFn: sendInvite,
    onSuccess: (data) => {
      setIsInviteOpen(false);
      setInviteEmail("");
      toast.success(`Invite sent successfully`);
      console.log("Invite Link:", data.inviteLink);
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });

  const handleInviteSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeWorkspaceId) {
      toast.error("Workspace ID missing");
      return;
    }

    // Proactive Member Limit Check
    if (isMemberLimitReached) {
      showUpgradePrompt("members");
      return;
    }

    inviteMutation.mutate({
      workspaceId: activeWorkspaceId,
      email: inviteEmail,
      role: inviteRole,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !activeWorkspaceId) return;

    // Proactive Team Limit Check
    if (isTeamLimitReached) {
      showUpgradePrompt("teams");
      return;
    }

    createMutation.mutate({ name, description });
  };

  if (isLoading) {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <Skeleton className="h-8 w-48 sm:w-64 mb-6" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-48 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (selectedTeam && view === "details") {
    return (
      <div className="p-4 sm:p-6 lg:p-8">
        <TeamDetails
          team={selectedTeam}
          onBack={() => {
            setView("list");
            setSelectedTeam(null);
          }}
        />
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-12 lg:p-16 max-w-7xl mx-auto relative selection:bg-indigo-500/30">
      {/* Neural Mesh Background */}
      <div className="absolute top-0 right-0 -z-20 w-[800px] h-[800px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 left-0 -z-20 w-[600px] h-[600px] bg-purple-600/5 blur-[100px] rounded-full pointer-events-none" />

      <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-10 mb-16">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <h1 className="text-5xl sm:text-7xl font-black uppercase tracking-tighter text-slate-900 dark:text-white leading-none">
            Neural <span className="text-indigo-600">Collective</span>
          </h1>
          <div className="flex items-center gap-4">
            <div className="h-1.5 w-16 bg-indigo-600 rounded-full" />
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] opacity-80">
              Workspace Collaboration & Permission Matrix
            </p>
          </div>
        </motion.div>
        
        <div className="flex flex-col sm:flex-row items-end gap-8 w-full lg:w-auto">
          <div className="flex flex-col items-end space-y-3">
            {teamLimits.max !== -1 && (
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Teams capacity</span>
                <div className="h-1 w-24 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-indigo-600" style={{ width: `${(teamLimits.current / teamLimits.max) * 100}%` }} />
                </div>
                <span className="text-[10px] font-black text-indigo-600">{teamLimits.current}/{teamLimits.max}</span>
              </div>
            )}
            {memberLimits.max !== -1 && (
              <div className="flex items-center gap-3">
                <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Neural Nodes</span>
                <div className="h-1 w-24 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-purple-600" style={{ width: `${(memberLimits.current / memberLimits.max) * 100}%` }} />
                </div>
                <span className="text-[10px] font-black text-purple-600">{memberLimits.current}/{memberLimits.max}</span>
              </div>
            )}
          </div>
          <Button 
              onClick={() => setIsOpen(true)} 
              className="h-14 px-10 rounded-2xl shadow-2xl shadow-indigo-500/20 bg-indigo-600 hover:bg-indigo-700 font-black uppercase tracking-[0.2em] text-[10px] transition-all hover:scale-105"
              variant={isTeamLimitReached ? "outline" : "default"}
          >
            <Plus className="h-4 w-4 mr-3" />
            Initialize Collective
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        <AnimatePresence>
          {teams?.map((team: any, i: number) => (
            <motion.div
              key={team.id}
              layout
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.1, duration: 0.6 }}
              onClick={() => {
                setSelectedTeam(team);
                setView("details");
              }}
              className="cursor-pointer group"
            >
              <Card className="glass-card border-none rounded-[3rem] h-full transition-all duration-700 hover:scale-[1.03] hover:shadow-[0_40px_80px_-20px_rgba(99,102,241,0.2)] overflow-hidden relative flex flex-col p-10">
                {team.status === "archived" && (
                  <div className="absolute top-8 left-8 bg-slate-100 dark:bg-slate-800 px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
                    Archived Collective
                  </div>
                )}

                <div className="absolute top-10 right-10 opacity-0 group-hover:opacity-100 transition-opacity duration-500">
                  <div className="bg-indigo-600/10 p-3 rounded-2xl text-indigo-600">
                    <ArrowLeft className="h-5 w-5 rotate-180" />
                  </div>
                </div>

                <div className="pt-6 space-y-8 flex-1">
                  <div className="flex items-center gap-6">
                    <div className="h-16 w-16 rounded-[1.5rem] bg-indigo-600/10 flex items-center justify-center text-indigo-600 shadow-sm group-hover:bg-indigo-600 group-hover:text-white transition-all duration-700 shrink-0">
                      <Users className="h-8 w-8" />
                    </div>
                    <div className="min-w-0">
                      <h3 className="text-2xl font-black tracking-tighter uppercase group-hover:text-indigo-600 transition-colors truncate">
                        {team.name}
                      </h3>
                      <div className="flex items-center gap-3 mt-2">
                        {team.userRole === "owner" || team.userRole === "admin" ? (
                          <span className="inline-flex items-center rounded-lg bg-indigo-500/10 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-indigo-600 border border-indigo-500/20">
                            {team.userRole === "owner" ? "Grandmaster" : "Admin"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 px-3 py-1 text-[9px] font-black uppercase tracking-widest text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
                            Member
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed h-12 line-clamp-3">
                      {team.description || "Operational collective synchronized within the neural core."}
                    </p>
                  </div>
                </div>

                <div className="mt-12 pt-8 border-t border-indigo-500/5 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex -space-x-3 overflow-hidden">
                      {team.members?.slice(0, 4).map((m: any) => (
                        <div
                          key={m.userId}
                          className="h-10 w-10 rounded-full ring-4 ring-white dark:ring-slate-950 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[10px] font-black uppercase overflow-hidden transition-all hover:scale-110 hover:z-10 shadow-xl"
                        >
                          {m.user?.imageUrl ? (
                            <Image src={m.user.imageUrl} alt={m.user.name || "Member"} width={40} height={40} className="h-full w-full object-cover" />
                          ) : (
                            (m.user?.name?.[0] || "?")
                          )}
                        </div>
                      ))}
                      {(team.membersCount || 0) > 4 && (
                        <div className="h-10 w-10 rounded-full ring-4 ring-white dark:ring-slate-950 bg-indigo-600 text-white flex items-center justify-center text-[9px] font-black uppercase z-10">
                          +{team.membersCount - 4}
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                      {team.membersCount || 1} Nodes
                    </span>
                  </div>

                  {(team.userRole === "admin" || team.userRole === "owner") && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-10 rounded-xl px-4 text-indigo-600 hover:text-white hover:bg-indigo-600 font-black uppercase tracking-widest text-[9px] transition-all"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTeam(team);
                        setIsInviteOpen(true);
                      }}
                    >
                      <UserPlus className="h-3.5 w-3.5 mr-2" />
                      Sync
                    </Button>
                  )}
                </div>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {teams?.length === 0 && (
        <div className="text-center py-32 bg-white/30 dark:bg-slate-900/30 backdrop-blur-xl rounded-[3rem] border-2 border-dashed border-indigo-500/10">
          <Users className="h-20 w-20 text-slate-300 mx-auto mb-8 floating" />
          <h3 className="text-2xl font-black uppercase tracking-tight mb-4">Neural Collective Empty</h3>
          <p className="text-slate-500 font-bold max-w-md mx-auto mb-10 text-sm">No collaborative groups detected. Initialize your first collective to synchronize your workforce.</p>
          <Button onClick={() => setIsOpen(true)} className="rounded-2xl h-14 px-10 shadow-xl bg-indigo-600 font-black uppercase tracking-widest text-[10px]">
            <Plus className="h-4 w-4 mr-2" />
            Initialize Collective
          </Button>
        </div>
      )}

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl border-indigo-500/20 rounded-[2.5rem] selection:bg-indigo-500/30 shadow-2xl">
          <div className="p-10 space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-black uppercase tracking-tighter">Initialize Collective</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Configure new team synchronization parameters</p>
            </div>
            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="space-y-4">
                <Label htmlFor="name" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Collective Identifier</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="e.g. ALPHA SQUADRON"
                  className="h-14 bg-white/50 dark:bg-slate-900/50 border-none rounded-2xl font-black text-lg focus-visible:ring-2 focus-visible:ring-indigo-500/20 uppercase tracking-tight"
                />
              </div>
              <div className="space-y-4">
                <Label htmlFor="description" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Mission Directive</Label>
                <Textarea
                  id="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Define collective objectives..."
                  className="min-h-[140px] bg-white/50 dark:bg-slate-900/50 border-none rounded-[2rem] font-bold text-sm focus-visible:ring-2 focus-visible:ring-indigo-500/20 p-6 leading-relaxed"
                />
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsOpen(false)} className="h-14 rounded-2xl px-8 font-black uppercase tracking-widest text-[10px]">Decline</Button>
                <Button type="submit" disabled={createMutation.isPending} className="h-14 rounded-2xl px-10 bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 font-black uppercase tracking-widest text-[10px]">
                  {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Authorize"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 overflow-hidden bg-white/90 dark:bg-slate-950/90 backdrop-blur-2xl border-indigo-500/20 rounded-[2.5rem] selection:bg-indigo-500/30 shadow-2xl">
          <div className="p-10 space-y-8">
            <div className="space-y-2">
              <h2 className="text-3xl font-black uppercase tracking-tighter">Synchronize Node</h2>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Transmit invite to {selectedTeam?.name}</p>
            </div>
            <form onSubmit={handleInviteSubmit} className="space-y-8">
              <div className="space-y-4">
                <Label htmlFor="email" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Node Address (Email)</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="node@neural.link"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  required
                  className="h-14 bg-white/50 dark:bg-slate-900/50 border-none rounded-2xl font-black text-lg focus-visible:ring-2 focus-visible:ring-indigo-500/20 tracking-tight"
                />
              </div>
              <div className="space-y-4">
                <Label htmlFor="role" className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Access Tier</Label>
                <select
                  id="role"
                  className="flex h-14 w-full rounded-2xl border-none bg-white/50 dark:bg-slate-900/50 px-6 py-2 text-sm font-black uppercase tracking-widest focus-visible:ring-2 focus-visible:ring-indigo-500/20"
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                >
                  <option value="member">Standard Node</option>
                  <option value="admin">Admin Overseer</option>
                </select>
              </div>
              <div className="flex justify-end gap-4 pt-4">
                <Button type="button" variant="ghost" onClick={() => setIsInviteOpen(false)} className="h-14 rounded-2xl px-8 font-black uppercase tracking-widest text-[10px]">Abort</Button>
                <Button type="submit" disabled={inviteMutation.isPending} className="h-14 rounded-2xl px-10 bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-500/20 font-black uppercase tracking-widest text-[10px]">
                  {inviteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Transmit"}
                </Button>
              </div>
            </form>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

