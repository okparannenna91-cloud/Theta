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

  const { data: teams, isLoading } = useQuery({
    queryKey: ["teams", activeWorkspaceId],
    queryFn: () => fetchTeams(activeWorkspaceId),
    enabled: !!activeWorkspaceId,
  });

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
    if (!selectedTeam?.workspaceId) {
      toast.error("Workspace ID missing");
      return;
    }
    inviteMutation.mutate({
      workspaceId: selectedTeam.workspaceId,
      email: inviteEmail,
      role: inviteRole,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
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
    <div className="p-4 sm:p-6 lg:p-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex-1"
        >
          <h1 className="text-3xl font-bold mb-2 bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
            Teams
          </h1>
          <p className="text-muted-foreground flex items-center gap-2 font-medium">
            <Users className="h-4 w-4" />
            Manage your collaborative groups
          </p>
        </motion.div>
        <Button onClick={() => setIsOpen(true)} className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 shadow-md">
          <Plus className="h-4 w-4 mr-2" />
          Create New Team
        </Button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        <AnimatePresence>
          {teams?.map((team: any, i: number) => (
            <motion.div
              key={team.id}
              layout
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => {
                setSelectedTeam(team);
                setView("details");
              }}
              className="cursor-pointer group"
            >
              <Card className="h-full border-slate-200 dark:border-slate-800 hover:border-indigo-400 dark:hover:border-indigo-500 transition-all duration-300 shadow-sm hover:shadow-lg hover:-translate-y-1 overflow-hidden relative flex flex-col">
                {team.status === "archived" && (
                  <div className="absolute top-0 left-0 bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-br-lg text-[10px] font-bold uppercase text-slate-500 border-b border-r">
                    Archived
                  </div>
                )}

                <div className="absolute top-0 right-0 p-4 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="bg-indigo-50 dark:bg-indigo-900/30 p-2 rounded-full">
                    <ArrowLeft className="h-4 w-4 text-indigo-600 rotate-180" />
                  </div>
                </div>

                <CardHeader className="pb-3 pt-6">
                  <div className="flex items-start gap-4">
                    <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-md group-hover:scale-110 transition-transform shrink-0">
                      <Users className="h-6 w-6" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-lg group-hover:text-indigo-600 transition-colors truncate pr-6">
                        {team.name}
                      </CardTitle>
                      <div className="flex items-center gap-2 mt-1">
                        {team.userRole === "owner" || team.userRole === "admin" ? (
                          <span className="inline-flex items-center rounded-full bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 text-xs font-medium text-indigo-700 dark:text-indigo-300 ring-1 ring-inset ring-indigo-700/10">
                            {team.userRole === "owner" ? "Owner" : "Admin"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded-full bg-slate-50 dark:bg-slate-900/30 px-2 py-0.5 text-xs font-medium text-slate-600 dark:text-slate-400 ring-1 ring-inset ring-slate-500/10">
                            Member
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  {team.description ? (
                    <CardDescription className="line-clamp-2 mt-3 text-sm h-10">
                      {team.description}
                    </CardDescription>
                  ) : (
                    <div className="h-10 mt-3" />
                  )}
                </CardHeader>

                <CardContent className="mt-auto pt-0 pb-4">
                  <div className="flex items-center justify-between pt-4 border-t border-slate-50 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                      <div className="flex -space-x-2 overflow-hidden">
                        {team.members?.slice(0, 4).map((m: any) => (
                          <div
                            key={m.userId}
                            className="h-7 w-7 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px] font-bold overflow-hidden"
                            title={m.user?.name || "User"}
                          >
                            {m.user?.imageUrl ? (
                              <Image src={m.user.imageUrl} alt={m.user.name || "Member"} width={28} height={28} className="h-full w-full object-cover" />
                            ) : (
                              (m.user?.name?.[0] || "?")
                            )}
                          </div>
                        ))}
                        {(team.membersCount || 0) > 4 && (
                          <div className="h-7 w-7 rounded-full border-2 border-white dark:border-slate-900 bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-[9px] font-medium text-muted-foreground">
                            +{team.membersCount - 4}
                          </div>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground ml-1">
                        {team.membersCount || 1} members
                      </span>
                    </div>

                    {(team.userRole === "admin" || team.userRole === "owner") && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 px-2 text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTeam(team);
                          setIsInviteOpen(true);
                        }}
                      >
                        <UserPlus className="h-3.5 w-3.5 mr-1" />
                        Invite
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {
        teams?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              No teams yet. Create your first team!
            </p>
            <Button onClick={() => setIsOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create Team
            </Button>
          </div>
        )
      }

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Team Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Invite to {selectedTeam?.name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleInviteSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="colleague@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value)}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsInviteOpen(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={inviteMutation.isPending}>
                {inviteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send Invite"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div >
  );
}

