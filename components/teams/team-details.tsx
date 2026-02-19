"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
    Users,
    MessageSquare,
    Settings,
    UserPlus,
    ArrowLeft,
    Shield,
    Mail,
    Copy,
    Check,
    MoreVertical,
    Clock,
    Loader2,
    Trash2,
    LogOut,
    Crown,
    AlertCircle,
    Archive,
    X,
    Activity,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { TeamChat } from "./team-chat";
import { format } from "date-fns";
import Image from "next/image";

interface TeamDetailsProps {
    team: any;
    onBack: () => void;
}

export function TeamDetails({ team: initialTeam, onBack }: TeamDetailsProps) {
    const [team, setTeam] = useState(initialTeam);
    const [activeTab, setActiveTab] = useState("members");
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("member");
    const [copiedLink, setCopiedLink] = useState(false);

    // Team Edit State
    const [editName, setEditName] = useState(team.name);
    const [editDescription, setEditDescription] = useState(team.description || "");
    const [editStatus, setEditStatus] = useState(team.status || "active");
    const [editDefaultRole, setEditDefaultRole] = useState(team.defaultRole || "member");
    const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

    const queryClient = useQueryClient();
    const isAdmin = team.userRole === "admin" || team.userRole === "owner";
    const isOwner = team.userRole === "owner";

    // --- QUERIES ---

    const { data: members, isLoading: isLoadingMembers } = useQuery({
        queryKey: ["team-members", team.id],
        queryFn: async () => {
            const res = await fetch(`/api/teams/${team.id}/members`);
            if (!res.ok) throw new Error("Failed to fetch members");
            return res.json();
        }
    });

    const { data: invites, isLoading: isLoadingInvites } = useQuery({
        queryKey: ["team-invites", team.id], // Scope to team
        queryFn: async () => {
            // Fetch invites for this specific team if possible, or workspace invites filtered
            // Updated API supports teamId filter
            const res = await fetch(`/api/invites?workspaceId=${team.workspaceId}&teamId=${team.id}`);
            if (!res.ok) throw new Error("Failed to fetch invites");
            return res.json();
        }
    });

    const { data: activities, isLoading: isLoadingActivities } = useQuery({
        queryKey: ["team-activity", team.id],
        queryFn: async () => {
            const res = await fetch(`/api/activity?workspaceId=${team.workspaceId}&entityId=${team.id}&entityType=team`);
            if (!res.ok) throw new Error("Failed to fetch activity");
            return res.json();
        }
    });

    // --- MUTATIONS ---

    const updateTeamMutation = useMutation({
        mutationFn: async (data: any) => {
            const res = await fetch(`/api/teams/${team.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) throw new Error("Failed to update team");
            return res.json();
        },
        onSuccess: (updatedTeam) => {
            setTeam({ ...team, ...updatedTeam });
            toast.success("Team updated successfully");
            queryClient.invalidateQueries({ queryKey: ["teams"] });
        },
        onError: () => toast.error("Failed to update team"),
    });

    const deleteTeamMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch(`/api/teams/${team.id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete team");
        },
        onSuccess: () => {
            toast.success("Team deleted");
            queryClient.invalidateQueries({ queryKey: ["teams"] });
            onBack();
        },
    });

    const inviteMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/invites", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    workspaceId: team.workspaceId,
                    teamId: team.id,
                    email: inviteEmail,
                    role: inviteRole,
                }),
            });
            if (!res.ok) throw new Error("Failed to send invite");
            return res.json();
        },
        onSuccess: () => {
            toast.success("Invite sent successfully");
            setInviteEmail("");
            queryClient.invalidateQueries({ queryKey: ["team-invites"] });
        },
        onError: () => toast.error("Failed to send invite"),
    });

    const revokeInviteMutation = useMutation({
        mutationFn: async (inviteId: string) => {
            const res = await fetch(`/api/invites?id=${inviteId}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to revoke invite");
        },
        onSuccess: () => {
            toast.success("Invite revoked");
            queryClient.invalidateQueries({ queryKey: ["team-invites"] });
        },
    });

    const removeMemberMutation = useMutation({
        mutationFn: async (userId: string) => {
            const res = await fetch(`/api/teams/${team.id}/members?userId=${userId}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to remove member");
        },
        onSuccess: () => {
            toast.success("Member removed");
            queryClient.invalidateQueries({ queryKey: ["team-members"] });
            queryClient.invalidateQueries({ queryKey: ["teams"] }); // Update count
        },
    });

    const changeRoleMutation = useMutation({
        mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
            const res = await fetch(`/api/teams/${team.id}/members`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ userId, role }),
            });
            if (!res.ok) throw new Error("Failed to update role");
        },
        onSuccess: () => {
            toast.success("Role updated");
            queryClient.invalidateQueries({ queryKey: ["team-members"] });
        },
    });


    // --- HANDLERS ---

    const copyInviteLink = () => {
        // This should ideally be a unique link per invite, but for generic team link:
        const link = `${window.location.origin}/join/${team.id}`; // Conceptual
        navigator.clipboard.writeText(link);
        setCopiedLink(true);
        toast.success("Link copied");
        setTimeout(() => setCopiedLink(false), 2000);
    };

    const tabs = [
        { id: "members", label: "Members", icon: Users },
        { id: "chat", label: "Chat", icon: MessageSquare },
        { id: "invites", label: "Invitations", icon: UserPlus },
        { id: "activity", label: "Activity", icon: Activity },
        { id: "settings", label: "Settings", icon: Settings },
    ];

    if (!isAdmin) {
        // Hide settings tab for non-admins? or just show limited view
        // Keeping it for visibility but disabling actions
    }

    return (
        <div className="space-y-6 max-w-6xl mx-auto">
            {/* --- HEADER --- */}
            <div className="flex items-center justify-between mb-6">
                <Button variant="ghost" className="gap-2 pl-0 hover:pl-2 transition-all" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4" /> Back to Teams
                </Button>
                <div className="flex gap-2">
                    {team.status === "archived" && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                            <Archive className="h-3 w-3 mr-1" /> Archived
                        </Badge>
                    )}
                    <Badge variant={team.status === "active" ? "default" : "outline"} className="capitalize">
                        {team.status}
                    </Badge>
                </div>
            </div>

            <div className="flex flex-col md:flex-row gap-6 items-start justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        {team.name}
                        {isAdmin && <Shield className="h-5 w-5 text-indigo-500" />}
                    </h1>
                    <p className="text-slate-500 mt-2 max-w-2xl text-lg">
                        {team.description || "No description provided."}
                    </p>
                </div>
                <div className="flex items-center gap-4 bg-white dark:bg-slate-900 p-2 rounded-xl shadow-sm border">
                    <div className="flex -space-x-3">
                        {members?.slice(0, 5).map((m: any) => (
                            <div key={m.userId} className="h-10 w-10 rounded-full border-2 border-white dark:border-slate-900 bg-slate-200 flex items-center justify-center overflow-hidden" title={m.user?.name}>
                                {m.user?.imageUrl ? (
                                    <Image src={m.user.imageUrl} alt={m.user.name || "Member"} width={40} height={40} className="h-full w-full object-cover" />
                                ) : (
                                    <span className="text-xs font-bold">{m.user?.name?.[0]}</span>
                                )}
                            </div>
                        ))}
                    </div>
                    <div className="px-2">
                        <p className="font-bold text-lg">{members?.length || team.membersCount}</p>
                        <p className="text-xs text-muted-foreground uppercase tracking-wide font-semibold">Members</p>
                    </div>
                </div>
            </div>

            {/* --- TABS --- */}
            <div className="border-b sticky top-0 bg-background/95 backdrop-blur z-10 pt-4">
                <div className="flex gap-6">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`
                                flex items-center pb-4 text-sm font-medium border-b-2 transition-all
                                ${activeTab === tab.id
                                    ? "border-indigo-600 text-indigo-600"
                                    : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"}
                            `}
                        >
                            <tab.icon className="h-4 w-4 mr-2" />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* --- CONTENT --- */}
            <div className="pt-6 min-h-[400px]">
                <AnimatePresence mode="wait">

                    {/* MEMBERS TAB */}
                    {activeTab === "members" && (
                        <motion.div
                            key="members"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="space-y-4"
                        >
                            <div className="grid grid-cols-1 gap-4">
                                {members?.map((member: any) => (
                                    <div key={member.id} className="group flex items-center justify-between p-4 bg-white dark:bg-slate-900 rounded-xl border hover:shadow-md transition-all">
                                        <div className="flex items-center gap-4">
                                            <div className="h-12 w-12 rounded-full bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 flex items-center justify-center font-bold text-lg overflow-hidden">
                                                {member.user?.imageUrl ? (
                                                    <Image src={member.user.imageUrl} alt={member.user.name || "Member"} width={48} height={48} className="h-full w-full object-cover" />
                                                ) : (
                                                    member.user?.name?.[0]
                                                )}
                                            </div>
                                            <div>
                                                <p className="font-semibold text-lg flex items-center gap-2">
                                                    {member.user?.name}
                                                    {member.role === "owner" && <Crown className="h-3 w-3 text-amber-500 fill-amber-500" />}
                                                </p>
                                                <p className="text-sm text-slate-500">{member.user?.email}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <Badge variant={member.role === "admin" || member.role === "owner" ? "default" : "secondary"} className="uppercase text-[10px]">
                                                    {member.role}
                                                </Badge>
                                                {member.user?.lastActiveAt && (
                                                    <p className="text-[10px] text-muted-foreground mt-1">
                                                        Active {format(new Date(member.user.lastActiveAt), "MMM d")}
                                                    </p>
                                                )}
                                            </div>

                                            {isAdmin && member.userId !== team.userId && ( // Can't edit self here simply to avoid lock-out
                                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {member.role !== "owner" && (
                                                        <select
                                                            className="h-8 text-xs border rounded bg-transparent px-2"
                                                            value={member.role}
                                                            onChange={(e) => changeRoleMutation.mutate({ userId: member.userId, role: e.target.value })}
                                                            disabled={changeRoleMutation.isPending}
                                                        >
                                                            <option value="member">Member</option>
                                                            <option value="admin">Admin</option>
                                                        </select>
                                                    )}

                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                        onClick={() => {
                                                            if (confirm("Are you sure you want to remove this member?")) {
                                                                removeMemberMutation.mutate(member.userId);
                                                            }
                                                        }}
                                                    >
                                                        <LogOut className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {/* CHAT TAB */}
                    {activeTab === "chat" && (
                        <motion.div
                            key="chat"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="bg-white dark:bg-slate-900 rounded-2xl border shadow-sm h-[600px] overflow-hidden"
                        >
                            <TeamChat teamId={team.id} workspaceId={team.workspaceId} />
                        </motion.div>
                    )}

                    {/* INVITES TAB */}
                    {activeTab === "invites" && (
                        <motion.div
                            key="invites"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="grid grid-cols-1 lg:grid-cols-3 gap-8"
                        >
                            <div className="lg:col-span-2 space-y-6">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Invite New Members</CardTitle>
                                        <CardDescription>Send invitations via email to grow your team.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <Input
                                                placeholder="Email address"
                                                value={inviteEmail}
                                                onChange={e => setInviteEmail(e.target.value)}
                                                className="flex-1"
                                            />
                                            <select
                                                className="h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background"
                                                value={inviteRole}
                                                onChange={e => setInviteRole(e.target.value)}
                                            >
                                                <option value="member">Member</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                            <Button onClick={() => inviteMutation.mutate()} disabled={!inviteEmail || inviteMutation.isPending}>
                                                {inviteMutation.isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                                Send Invite
                                            </Button>
                                        </div>
                                    </CardContent>
                                </Card>

                                <div className="space-y-4">
                                    <h3 className="font-semibold text-sm text-muted-foreground uppercase">Pending Invitations</h3>
                                    {invites?.map((invite: any) => (
                                        <div key={invite.id} className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                                            <div className="flex items-center gap-3">
                                                <div className="h-8 w-8 rounded-full bg-white border flex items-center justify-center">
                                                    <Mail className="h-4 w-4 text-slate-400" />
                                                </div>
                                                <div>
                                                    <p className="font-medium text-sm">{invite.email}</p>
                                                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                        <span>{format(new Date(invite.createdAt), "MMM d, yyyy")}</span>
                                                        <span>•</span>
                                                        <span className="capitalize">{invite.role}</span>
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Badge variant="outline" className={
                                                    invite.status === "pending" ? "text-amber-600 bg-amber-50 border-amber-200" :
                                                        invite.status === "revoked" ? "text-red-600 bg-red-50" : ""
                                                }>
                                                    {invite.status}
                                                </Badge>
                                                {isAdmin && invite.status === "pending" && (
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                                                        onClick={() => revokeInviteMutation.mutate(invite.id)}
                                                    >
                                                        Revoke
                                                    </Button>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                    {(!invites || invites.length === 0) && (
                                        <div className="text-center py-8 text-slate-400 italic">No pending invitations</div>
                                    )}
                                </div>
                            </div>

                            <div className="space-y-6">
                                <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-900 dark:to-slate-900 border-indigo-100 dark:border-slate-800">
                                    <CardHeader>
                                        <CardTitle className="text-indigo-900 dark:text-indigo-200">Pro Tip</CardTitle>
                                        <CardDescription className="text-indigo-700/70 dark:text-indigo-300/70">
                                            Admins can manage roles and remove members at any time.
                                            Invited members will receive an email instruction.
                                        </CardDescription>
                                    </CardHeader>
                                </Card>
                            </div>
                        </motion.div>
                    )}

                    {/* ACTIVITY TAB */}
                    {activeTab === "activity" && (
                        <motion.div
                            key="activity"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            className="max-w-3xl"
                        >
                            <Card>
                                <CardHeader>
                                    <CardTitle>Team Activity</CardTitle>
                                    <CardDescription>Recent actions and updates within this team.</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-8 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-slate-300 before:to-transparent">
                                        {activities?.map((activity: any) => (
                                            <div key={activity.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                                <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white bg-slate-50 shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2">
                                                    {activity.user?.imageUrl ? (
                                                        <Image src={activity.user.imageUrl} alt={activity.user.name || "User"} width={40} height={40} className="h-full w-full object-cover rounded-full" />
                                                    ) : (
                                                        <Users className="h-5 w-5 text-slate-400" />
                                                    )}
                                                </div>
                                                <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] p-4 rounded-xl border bg-white dark:bg-slate-900 shadow-sm">
                                                    <div className="flex items-center justify-between space-x-2 mb-1">
                                                        <div className="font-bold text-slate-900 dark:text-slate-100">{activity.user?.name || "User"}</div>
                                                        <time className="font-caveat font-medium text-xs text-indigo-500">{format(new Date(activity.createdAt), "PP p")}</time>
                                                    </div>
                                                    <div className="text-slate-500 text-sm">
                                                        <span className="font-medium text-slate-800 dark:text-slate-200 capitalize">{activity.action}</span>
                                                        {" "}{activity.entityType}
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                        {(!activities || activities.length === 0) && (
                                            <div className="pl-12 py-4 text-muted-foreground italic">No recent activity recorded.</div>
                                        )}
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                    {/* SETTINGS TAB */}
                    {activeTab === "settings" && (
                        <motion.div
                            key="settings"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="max-w-2xl"
                        >
                            <Card>
                                <CardHeader>
                                    <CardTitle>Team Settings</CardTitle>
                                    <CardDescription>Manage general team information.</CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Team Name</label>
                                        <Input value={editName} onChange={e => setEditName(e.target.value)} disabled={!isAdmin} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Description</label>
                                        <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} disabled={!isAdmin} />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Status</label>
                                        <select
                                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={editStatus}
                                            onChange={e => setEditStatus(e.target.value)}
                                            disabled={!isAdmin}
                                        >
                                            <option value="active">Active</option>
                                            <option value="archived">Archived</option>
                                        </select>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium">Default Role for New Members</label>
                                        <select
                                            className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm"
                                            value={editDefaultRole}
                                            onChange={e => setEditDefaultRole(e.target.value)}
                                            disabled={!isAdmin}
                                        >
                                            <option value="member">Member</option>
                                            <option value="admin">Admin</option>
                                            <option value="guest">Guest</option>
                                        </select>
                                        <p className="text-[10px] text-muted-foreground">This role will be automatically assigned to users joining via generic team links.</p>
                                    </div>
                                </CardContent>
                                {isAdmin && (
                                    <CardFooter className="flex justify-between border-t pt-6">
                                        <Button
                                            variant="destructive"
                                            disabled={!isOwner}
                                            onClick={() => setIsDeleteDialogOpen(true)}
                                        >
                                            <Trash2 className="mr-2 h-4 w-4" /> Delete Team
                                        </Button>

                                        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                                            <DialogContent onClose={() => setIsDeleteDialogOpen(false)}>
                                                <DialogHeader>
                                                    <DialogTitle>Delete Team?</DialogTitle>
                                                    <DialogDescription>
                                                        This action cannot be undone. All tasks, chats, and data associated with
                                                        <span className="font-bold text-foreground"> {team.name} </span> will be permanently removed.
                                                    </DialogDescription>
                                                </DialogHeader>
                                                <DialogFooter>
                                                    <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                                                        Cancel
                                                    </Button>
                                                    <Button variant="destructive" onClick={() => deleteTeamMutation.mutate()}>
                                                        Confirm Delete
                                                    </Button>
                                                </DialogFooter>
                                            </DialogContent>
                                        </Dialog>

                                        <Button onClick={() => updateTeamMutation.mutate({
                                            name: editName,
                                            description: editDescription,
                                            status: editStatus,
                                            defaultRole: editDefaultRole
                                        })}>
                                            Save Changes
                                        </Button>
                                    </CardFooter>
                                )}
                            </Card>

                            <Card className="mt-8 border-indigo-100 bg-indigo-50/20">
                                <CardHeader>
                                    <CardTitle className="text-sm flex items-center gap-2">
                                        <Shield className="h-4 w-4 text-indigo-600" />
                                        Team Permissions Matrix
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="text-xs space-y-3">
                                        <div className="grid grid-cols-2 py-1 border-b">
                                            <span className="text-muted-foreground">Invite Members</span>
                                            <span className="font-medium">Admins, Owners</span>
                                        </div>
                                        <div className="grid grid-cols-2 py-1 border-b">
                                            <span className="text-muted-foreground">Manage Roles</span>
                                            <span className="font-medium">Owners, Workspace Admins</span>
                                        </div>
                                        <div className="grid grid-cols-2 py-1 border-b">
                                            <span className="text-muted-foreground">Delete Team</span>
                                            <span className="font-medium text-red-600">Owners Only</span>
                                        </div>
                                        <div className="grid grid-cols-2 py-1 border-b">
                                            <span className="text-muted-foreground">Team Chat</span>
                                            <span className="font-medium">All Members</span>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </div>
    );
}
