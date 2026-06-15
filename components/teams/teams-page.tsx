"use client";

import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Users, UserPlus, Loader2, ArrowLeft, Shield, Activity, Hash, CheckCircle2,
  Clock, Sparkles, Crown, MoreHorizontal, Copy, Check, ExternalLink, Search, SlidersHorizontal,
  ArrowUpDown, LayoutGrid, List, ChevronDown, X, BadgeCheck, Zap, Eye, EyeOff
} from "lucide-react";
import { toast } from "sonner";
import { TeamDetails } from "./team-details";
import Image from "next/image";
import { cn } from "@/lib/utils";

import { useWorkspace } from "@/hooks/use-workspace";
import { usePopups } from "@/components/popups/popup-manager";

async function fetchTeams(workspaceId: string | null) {
  const url = workspaceId ? `/api/teams?workspaceId=${workspaceId}` : "/api/teams";
  const res = await fetch(url);
  if (!res.ok) throw new Error("Failed to fetch teams");
  return res.json();
}

async function fetchTeamStats(teamId: string, workspaceId: string) {
  const res = await fetch(`/api/activity?workspaceId=${workspaceId}&entityId=${teamId}&entityType=team&limit=5`);
  if (!res.ok) return { activities: [], tasksCount: 0, projectsCount: 0 };
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

type SortOption = "name" | "members" | "recent";
type FilterStatus = "all" | "active" | "archived";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.04 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.96 },
  visible: {
    opacity: 1, y: 0, scale: 1,
    transition: { type: "spring", stiffness: 200, damping: 25 }
  }
};

export default function TeamsPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<any>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("member");
  const [view, setView] = useState<"list" | "details">("list");
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [sortBy, setSortBy] = useState<SortOption>("name");
  const [showSortDropdown, setShowSortDropdown] = useState(false);
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

  const totalMembers = useMemo(() =>
    teams.reduce((sum: number, t: any) => sum + (t.membersCount || 1), 0),
    [teams]
  );

  const filteredTeams = useMemo(() => {
    let result = teams.filter((t: any) => {
      if (filterStatus !== "all" && t.status !== filterStatus) return false;
      if (search && !t.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
    result = [...result].sort((a: any, b: any) => {
      switch (sortBy) {
        case "name": return a.name.localeCompare(b.name);
        case "members": return (b.membersCount || 0) - (a.membersCount || 0);
        case "recent": return new Date(b.updatedAt || b.createdAt).getTime() - new Date(a.updatedAt || a.createdAt).getTime();
        default: return 0;
      }
    });
    return result;
  }, [teams, filterStatus, search, sortBy]);

  const filteredCounts = useMemo(() => ({
    active: teams.filter((t: any) => t.status === "active" || !t.status).length,
    archived: teams.filter((t: any) => t.status === "archived").length,
  }), [teams]);

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
    onSuccess: () => {
      setIsInviteOpen(false); setInviteEmail("");
      toast.success("Invite sent successfully");
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

  const copyTeamId = (id: string) => {
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    toast.success("Team ID copied");
    setTimeout(() => setCopiedId(null), 2000);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "owner": return <Crown className="h-3 w-3 text-amber-500" />;
      case "admin": return <Shield className="h-3 w-3 text-indigo-500" />;
      default: return null;
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 max-w-7xl mx-auto">
        <Skeleton className="h-10 w-56" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Skeleton key={i} className="h-64 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (selectedTeam && view === "details") {
    return (
      <div className="max-w-7xl mx-auto">
        <TeamDetails team={selectedTeam} onBack={() => { setView("list"); setSelectedTeam(null); }} />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/20 to-indigo-500/20 border border-primary/10 flex items-center justify-center">
              <Users className="h-5 w-5 text-primary" />
            </div>
            <h1 className="text-3xl font-bold text-foreground tracking-tight">Teams</h1>
          </div>
          <p className="text-sm text-muted-foreground ml-[52px]">
            Collaborate with your team members and manage workspace groups
          </p>
        </div>
        <div className="flex items-center gap-4">
          {(teamLimits.max !== -1 || memberLimits.max !== -1) && (
            <div className="flex items-center gap-4 text-xs text-muted-foreground bg-muted/50 px-4 py-2.5 rounded-xl border">
              {teamLimits.max !== -1 && (
                <div className="flex items-center gap-2">
                  <Users className="h-3.5 w-3.5" />
                  <span>{teamLimits.current}/{teamLimits.max}</span>
                  <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(teamLimits.current / teamLimits.max) * 100}%` }} />
                  </div>
                </div>
              )}
              {memberLimits.max !== -1 && (
                <div className="flex items-center gap-2">
                  <UserPlus className="h-3.5 w-3.5" />
                  <span>{memberLimits.current}/{memberLimits.max}</span>
                  <div className="h-1.5 w-16 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full transition-all" style={{ width: `${(memberLimits.current / memberLimits.max) * 100}%` }} />
                  </div>
                </div>
              )}
            </div>
          )}
          <Button onClick={() => setIsOpen(true)} variant={isTeamLimitReached ? "outline" : "default"} className="h-11 px-6 rounded-xl shadow-sm">
            <Plus className="h-4 w-4 mr-2" /> New Team
          </Button>
        </div>
      </div>

      {/* Stats Summary Bar */}
      {teams.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-wrap items-center gap-6 mb-8 p-4 bg-muted/30 rounded-2xl border"
        >
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Teams</p>
                <p className="text-lg font-bold">{teams.length}</p>
              </div>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                <BadgeCheck className="h-4 w-4 text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Active</p>
                <p className="text-lg font-bold">{filteredCounts.active}</p>
              </div>
            </div>
            <div className="w-px h-10 bg-border" />
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <Users className="h-4 w-4 text-amber-500" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Total Members</p>
                <p className="text-lg font-bold">{totalMembers}</p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Search & Filter Bar */}
      {teams.length > 0 && (
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search teams by name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-10 h-11 rounded-xl bg-background border"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            {/* Status Filter Chips */}
            <div className="flex bg-muted/50 rounded-xl p-1 border">
              {(["all", "active", "archived"] as FilterStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setFilterStatus(status)}
                  className={cn(
                    "px-4 py-2 text-xs font-medium rounded-lg transition-all capitalize",
                    filterStatus === status
                      ? "bg-background text-foreground shadow-sm border"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  {status}
                  {status !== "all" && (
                    <span className="ml-1.5 text-[10px] opacity-60">
                      ({filteredCounts[status]})
                    </span>
                  )}
                </button>
              ))}
            </div>
            {/* Sort Dropdown */}
            <div className="relative">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSortDropdown(!showSortDropdown)}
                className="h-11 rounded-xl text-xs font-medium gap-2"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                {sortBy === "name" ? "Name" : sortBy === "members" ? "Members" : "Recent"}
                <ChevronDown className="h-3 w-3" />
              </Button>
              {showSortDropdown && (
                <>
                  <div className="fixed inset-0 z-10" onClick={() => setShowSortDropdown(false)} />
                  <div className="absolute right-0 top-full mt-1 z-20 w-40 bg-background border rounded-xl shadow-xl overflow-hidden">
                    {(["name", "members", "recent"] as SortOption[]).map((opt) => (
                      <button
                        key={opt}
                        onClick={() => { setSortBy(opt); setShowSortDropdown(false); }}
                        className={cn(
                          "w-full px-4 py-2.5 text-xs font-medium text-left hover:bg-muted transition-colors flex items-center gap-3",
                          sortBy === opt ? "text-primary bg-primary/5" : "text-muted-foreground"
                        )}
                      >
                        <div className={cn("h-1.5 w-1.5 rounded-full", sortBy === opt ? "bg-primary" : "bg-transparent")} />
                        {opt === "name" ? "Name" : opt === "members" ? "Most Members" : "Recently Active"}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {filteredTeams.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-24 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-950/50"
        >
          {search || filterStatus !== "all" ? (
            <>
              <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto mb-6">
                <Search className="h-8 w-8 text-muted-foreground" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No teams match your search</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                Try adjusting your search term or filter to find what you are looking for.
              </p>
              <Button
                variant="outline"
                onClick={() => { setSearch(""); setFilterStatus("all"); }}
                className="rounded-xl"
              >
                <X className="h-4 w-4 mr-2" /> Clear Filters
              </Button>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/10 to-indigo-500/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
                <Users className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-lg font-semibold mb-2">No teams yet</h3>
              <p className="text-sm text-muted-foreground mb-6 max-w-sm mx-auto">
                Create your first team to start collaborating with your colleagues on projects and tasks.
              </p>
              <Button onClick={() => setIsOpen(true)} className="rounded-xl shadow-sm">
                <Plus className="h-4 w-4 mr-2" /> Create Your First Team
              </Button>
            </>
          )}
        </motion.div>
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
        >
          <AnimatePresence mode="popLayout">
            {filteredTeams.map((team: any, idx: number) => (
              <motion.div
                key={team.id}
                layout
                variants={cardVariants}
                exit={{ opacity: 0, scale: 0.9, y: 20 }}
              >
                <Card
                  onClick={() => { setSelectedTeam(team); setView("details"); }}
                  className="group relative border shadow-sm hover:shadow-lg hover:border-primary/30 transition-all duration-300 cursor-pointer overflow-hidden rounded-2xl bg-card h-full flex flex-col"
                >
                  {/* Accent gradient bar */}
                  <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary via-indigo-500 to-primary/50 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  <CardContent className="p-6 flex flex-col flex-1">
                    {/* Top section */}
                    <div className="flex items-start justify-between mb-5">
                      <div className="flex items-center gap-4 min-w-0">
                        <div className={cn(
                          "h-14 w-14 rounded-2xl border flex items-center justify-center shrink-0 group-hover:text-white transition-all duration-300 shadow-sm",
                          "bg-gradient-to-br from-primary/10 to-indigo-500/10 border-primary/20",
                          "group-hover:from-primary group-hover:to-indigo-600"
                        )}>
                          <Users className="h-7 w-7 text-primary group-hover:text-white transition-colors" />
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-base font-semibold truncate group-hover:text-primary transition-colors max-w-[160px] flex items-center gap-2">
                            {team.name}
                            {team.userRole === "owner" && <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                          </h3>
                          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                            {(team.userRole === "owner" || team.userRole === "admin") && (
                              <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-[11px] font-medium text-primary border border-primary/20">
                                <Shield className="h-3 w-3" />
                                {team.userRole === "owner" ? "Owner" : "Admin"}
                              </span>
                            )}
                            {team.status === "archived" && (
                              <span className="inline-flex items-center rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 border border-amber-500/20">
                                Archived
                              </span>
                            )}
                            {(team.membersCount || 1) <= 1 && team.userRole === "member" && !team.status && (
                              <span className="inline-flex items-center rounded-md bg-sky-500/10 px-2 py-0.5 text-[11px] font-medium text-sky-600 border border-sky-500/20">
                                Solo
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 rounded-lg opacity-0 group-hover:opacity-100 transition-all text-muted-foreground hover:text-foreground shrink-0"
                        onClick={(e) => { e.stopPropagation(); copyTeamId(team.id); }}
                      >
                        {copiedId === team.id ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                      </Button>
                    </div>

                    {/* Description */}
                    {team.description ? (
                      <p className="text-xs text-muted-foreground line-clamp-2 mb-5 leading-relaxed flex-1">
                        {team.description}
                      </p>
                    ) : (
                      <p className="text-xs text-muted-foreground/40 italic mb-5 flex-1">
                        No description provided.
                      </p>
                    )}

                    {/* Members Row */}
                    <div className="flex items-center justify-between pt-4 border-t mt-auto">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex -space-x-2">
                          {team.members?.slice(0, 4).map((m: any) => (
                            <div
                              key={m.userId}
                              className="h-8 w-8 rounded-full ring-2 ring-background bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-xs font-medium overflow-hidden relative"
                            >
                              {m.user?.imageUrl ? (
                                <Image src={m.user.imageUrl} alt={m.user.name || "Member"} width={32} height={32} className="h-full w-full object-cover" />
                              ) : (m.user?.name?.[0] || "?")}
                              <span className={cn(
                                "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
                                m.isOnline ? "bg-emerald-500" : "bg-slate-400"
                              )} />
                            </div>
                          ))}
                          {(team.membersCount || 0) > 4 && (
                            <div className="h-8 w-8 rounded-full ring-2 ring-background bg-primary/10 text-primary flex items-center justify-center text-[10px] font-medium">
                              +{team.membersCount - 4}
                            </div>
                          )}
                          {(team.members?.length || 0) === 0 && (
                            <div className="h-8 w-8 rounded-full ring-2 ring-background bg-muted flex items-center justify-center">
                              <Users className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        <span className="text-xs text-muted-foreground font-medium tabular-nums">
                          {team.membersCount || 1} member{(team.membersCount || 1) !== 1 ? "s" : ""}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <Zap className="h-3 w-3 text-emerald-500" />
                        <span className="text-[11px] text-emerald-600 font-medium">Active</span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex gap-2 mt-4 pt-4 border-t">
                      {(team.userRole === "admin" || team.userRole === "owner") && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="flex-1 h-9 rounded-lg text-xs font-medium"
                          onClick={(e) => { e.stopPropagation(); setSelectedTeam(team); setIsInviteOpen(true); }}
                        >
                          <UserPlus className="h-3.5 w-3.5 mr-1.5" /> Invite
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="sm"
                        className={cn(
                          "flex-1 h-9 rounded-lg text-xs font-medium",
                          team.userRole !== "admin" && team.userRole !== "owner" ? "bg-primary/5 text-primary hover:bg-primary/10" : "text-muted-foreground hover:text-foreground"
                        )}
                        onClick={(e) => { e.stopPropagation(); setSelectedTeam(team); setView("details"); }}
                      >
                        <ExternalLink className="h-3.5 w-3.5 mr-1.5" /> Open
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </motion.div>
      )}

      {/* Results info */}
      {filteredTeams.length > 0 && (
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs text-center text-muted-foreground mt-8"
        >
          Showing {filteredTeams.length} of {teams.length} team{(teams.length) !== 1 ? "s" : ""}
          {search && ` matching "${search}"`}
          {filterStatus !== "all" && ` (${filterStatus})`}
        </motion.p>
      )}

      {/* Create Team Dialog */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary/10 to-indigo-500/10 border border-primary/20 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <DialogTitle className="text-xl font-semibold">New Team</DialogTitle>
            </div>
            <p className="text-sm text-muted-foreground">Create a new collaboration group within your workspace.</p>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-5 mt-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-sm font-medium">Team Name</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="e.g. Engineering" className="h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="description" className="text-sm font-medium">Description</Label>
              <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe the team's purpose..." className="rounded-xl min-h-[100px]" />
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={createMutation.isPending} className="rounded-xl shadow-sm">
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Create Team
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      {/* Invite Dialog */}
      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent className="sm:max-w-[500px] rounded-2xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20 flex items-center justify-center">
                <UserPlus className="h-5 w-5 text-emerald-500" />
              </div>
              <DialogTitle className="text-xl font-semibold">Invite Member</DialogTitle>
            </div>
            <p className="text-sm text-muted-foreground">Add a new member to <strong>{selectedTeam?.name || "team"}</strong>.</p>
          </DialogHeader>
          <form onSubmit={handleInviteSubmit} className="space-y-5 mt-4">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
              <Input id="email" type="email" placeholder="colleague@company.com" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required className="h-11 rounded-xl" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="role" className="text-sm font-medium">Role</Label>
              <select id="role"
                className="flex h-11 w-full rounded-xl border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                <option value="member">Member - Can view and participate</option>
                <option value="admin">Admin - Can manage team settings</option>
              </select>
            </div>
            <div className="flex items-start gap-3 p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/10">
              <Shield className="h-5 w-5 text-indigo-500 shrink-0 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <p className="font-medium text-indigo-600 dark:text-indigo-400 mb-1">Security Notice</p>
                <p>Invited members will have access to team projects, boards, and chat. Their role determines what they can manage.</p>
              </div>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)} className="rounded-xl">Cancel</Button>
              <Button type="submit" disabled={inviteMutation.isPending} className="rounded-xl shadow-sm">
                {inviteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Send Invite
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
