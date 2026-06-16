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
    Search,
    Hash,
    Calendar,
    BarChart3,
    Zap,
    Link2,
    ExternalLink,
    UserCheck,
    UserX,
    Eye,
    EyeOff,
    BadgeCheck,
    Wifi,
    WifiOff,
    ChevronDown,
    ShieldCheck,
    Fingerprint,
    Sparkles,
    UserCog,
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
import { usePopups } from "@/components/popups/popup-manager";
import { format, formatDistanceToNow } from "date-fns";
import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

interface TeamDetailsProps {
    team: any;
    onBack: () => void;
}

const statusColors: Record<string, string> = {
    active: "bg-emerald-500",
    archived: "bg-amber-500",
    idle: "bg-slate-400",
};

const tabVariants = {
    enter: { opacity: 0, y: 12 },
    center: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -12 },
};

export function TeamDetails({ team: initialTeam, onBack }: TeamDetailsProps) {
    const [team, setTeam] = useState(initialTeam);
    const [activeTab, setActiveTab] = useState("members");
    const [inviteEmail, setInviteEmail] = useState("");
    const [inviteRole, setInviteRole] = useState("member");
    const [copiedLink, setCopiedLink] = useState(false);
    const [memberSearch, setMemberSearch] = useState("");

    const parsedEmails = inviteEmail
        .split(",")
        .map(e => e.trim())
        .filter(e => e.includes("@") && e.includes("."));

    // Team Edit State
    const [editName, setEditName] = useState(team.name);
    const [editDescription, setEditDescription] = useState(team.description || "");
    const [editStatus, setEditStatus] = useState(team.status || "active");
    const [editDefaultRole, setEditDefaultRole] = useState(team.defaultRole || "member");
    const { showConfirm, showUpgradePrompt } = usePopups();

    const queryClient = useQueryClient();
    const isAdmin = team.userRole === "admin" || team.userRole === "owner";
    const isOwner = team.userRole === "owner";

    // --- QUERIES ---

    const { data: members, isLoading: isLoadingMembers } = useQuery({
        queryKey: ["team-members", team.id, team.workspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/teams/${team.id}/members?workspaceId=${team.workspaceId}`);
            if (!res.ok) throw new Error("Failed to fetch members");
            return res.json();
        }
    });

    const { data: invites, isLoading: isLoadingInvites } = useQuery({
        queryKey: ["team-invites", team.id, team.workspaceId],
        queryFn: async () => {
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
            const data = await res.json();
            return data.activities || [];
        }
    });

    const { data: projects, isLoading: isLoadingProjects } = useQuery({
        queryKey: ["team-projects", team.id],
        queryFn: async () => {
            const res = await fetch(`/api/projects?workspaceId=${team.workspaceId}&teamId=${team.id}`);
            if (!res.ok) throw new Error("Failed to fetch projects");
            return res.json();
        }
    });

    const { data: boards, isLoading: isLoadingBoards } = useQuery({
        queryKey: ["team-boards", team.id],
        queryFn: async () => {
            const res = await fetch(`/api/boards?workspaceId=${team.workspaceId}&teamId=${team.id}`);
            if (!res.ok) throw new Error("Failed to fetch boards");
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
            const emails = parsedEmails;
            if (emails.length === 0) throw new Error("Please enter a valid email address");
            const res = await fetch("/api/invites", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    workspaceId: team.workspaceId,
                    teamId: team.id,
                    emails,
                    role: inviteRole,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed to send invite");
            return json;
        },
        onSuccess: (data) => {
            const count = data.allInvites?.length || 1;
            if (data.inviteLink && count === 1) {
                navigator.clipboard.writeText(data.inviteLink).catch(() => {});
                toast.success(`Invite sent! Link copied to clipboard.`, { description: data.inviteLink, duration: 8000 });
            } else {
                toast.success(`${count} invite${count > 1 ? "s" : ""} sent successfully!`);
            }
            setInviteEmail("");
            queryClient.invalidateQueries({ queryKey: ["team-invites"] });
        },
        onError: (err: any) => toast.error(err.message || "Failed to send invite"),
    });

    const revokeInviteMutation = useMutation({
        mutationFn: async (inviteId: string) => {
            const res = await fetch(`/api/invites?id=${inviteId}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to revoke invite");
        },
        onSuccess: () => {
            toast.success("Invite revoked");
            queryClient.invalidateQueries({ queryKey: ["team-invites", team.id] });
        },
    });

    const resendInviteMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/invites?id=${id}`, { method: "PATCH" });
            if (!res.ok) throw new Error("Failed to resend invite");
            return res.json();
        },
        onSuccess: () => {
            toast.success("Invite resent successfully");
            queryClient.invalidateQueries({ queryKey: ["team-invites", team.id] });
        },
        onError: () => {
            toast.error("Failed to resend invite");
        }
    });

    const removeMemberMutation = useMutation({
        mutationFn: async (userId: string) => {
            const res = await fetch(`/api/teams/${team.id}/members?userId=${userId}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to remove member");
        },
        onSuccess: () => {
            toast.success("Member removed");
            queryClient.invalidateQueries({ queryKey: ["team-members"] });
            queryClient.invalidateQueries({ queryKey: ["teams"] });
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

    const memberList = Array.isArray(members) ? members : [];
    const memberCount = memberList.length || team.membersCount || 1;
    const projectCount = Array.isArray(projects) ? projects.length : 0;
    const boardCount = Array.isArray(boards) ? boards.length : 0;
    const activeCount = memberList.filter((m: any) => m.isOnline).length;

    // --- HANDLERS ---

    const copyInviteLink = () => {
        const link = `${window.location.origin}/join/${team.id}`;
        navigator.clipboard.writeText(link);
        setCopiedLink(true);
        toast.success("Link copied");
        setTimeout(() => setCopiedLink(false), 2000);
    };

    const tabs = [
        { id: "overview", label: "Overview", icon: BarChart3 },
        { id: "members", label: "Members", icon: Users, count: memberCount },
        { id: "projects", label: "Projects", icon: Archive, count: projectCount },
        { id: "boards", label: "Boards", icon: Shield, count: boardCount },
        { id: "chat", label: "Chat", icon: MessageSquare },
        { id: "invites", label: "Invitations", icon: UserPlus },
        { id: "activity", label: "Activity", icon: Activity },
        { id: "settings", label: "Settings", icon: Settings },
    ];

    const canManageSettings = isAdmin;

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-12">
            {/* --- HEADER --- */}
            <div className="flex items-center justify-between mb-2">
                <Button variant="ghost" className="gap-2 pl-0 hover:pl-2 transition-all group" onClick={onBack}>
                    <ArrowLeft className="h-4 w-4 group-hover:-translate-x-0.5 transition-transform" /> Back to Teams
                </Button>
                <div className="flex gap-2">
                    {team.status === "archived" && (
                        <Badge variant="secondary" className="bg-amber-100 text-amber-800 hover:bg-amber-200">
                            <Archive className="h-3 w-3 mr-1" /> Archived
                        </Badge>
                    )}
                    <Badge className={cn(
                        "capitalize",
                        team.status === "active" ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" : ""
                    )} variant={team.status === "active" ? "default" : "outline"}>
                        <span className={cn(
                            "h-1.5 w-1.5 rounded-full mr-1.5",
                            statusColors[team.status] || "bg-slate-400"
                        )} />
                        {team.status}
                    </Badge>
                </div>
            </div>

            {/* --- TEAM INFO & STATS BANNER --- */}
            <div className="flex flex-col lg:flex-row gap-6 items-start justify-between">
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-4 mb-2">
                        <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/10 to-indigo-500/10 border border-primary/20 flex items-center justify-center shrink-0">
                            <Users className="h-8 w-8 text-primary" />
                        </div>
                        <div className="min-w-0">
                            <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                                {team.name}
                                {isAdmin && (
                                    <span className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
                                        <Shield className="h-3 w-3" />
                                        {team.userRole === "owner" ? "Owner" : "Admin"}
                                    </span>
                                )}
                            </h1>
                            <p className="text-muted-foreground mt-1 max-w-2xl">
                                {team.description || "No description provided."}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Quick Stats */}
                <div className="flex items-center gap-3 bg-card p-2.5 rounded-2xl border shadow-sm">
                    <div className="flex -space-x-3">
                        {memberList.slice(0, 5).map((m: any) => (
                            <div key={m.userId} className="h-10 w-10 rounded-full ring-2 ring-card bg-slate-200 flex items-center justify-center overflow-hidden relative" title={m.user?.name}>
                                {m.user?.imageUrl ? (
                                    <Image src={m.user.imageUrl} alt={m.user.name || "Member"} width={40} height={40} className="h-full w-full object-cover" />
                                ) : (
                                    <span className="text-xs font-bold">{m.user?.name?.[0] || "?"}</span>
                                )}
                                <span className={cn(
                                    "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-card",
                                    m.isOnline ? "bg-emerald-500" : "bg-slate-400"
                                )} />
                            </div>
                        ))}
                    </div>
                    <div className="flex items-center divide-x">
                        <div className="px-4 text-center">
                            <p className="font-bold text-lg tabular-nums">{memberCount}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Members</p>
                        </div>
                        <div className="px-4 text-center">
                            <p className="font-bold text-lg tabular-nums">{projectCount}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Projects</p>
                        </div>
                        <div className="px-4 text-center">
                            <p className="font-bold text-lg tabular-nums">{activities?.length || 0}</p>
                            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Actions</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- TABS --- */}
            <div className="border-b sticky top-0 bg-background/95 backdrop-blur z-10 pt-2">
                <div className="flex gap-1 overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all whitespace-nowrap",
                                activeTab === tab.id
                                    ? "border-indigo-600 text-indigo-600"
                                    : "border-transparent text-muted-foreground hover:text-foreground hover:border-slate-300"
                            )}
                        >
                            <tab.icon className="h-4 w-4" />
                            {tab.label}
                            {tab.count !== undefined && (
                                <span className={cn(
                                    "text-[10px] font-bold px-1.5 py-0.5 rounded-full",
                                    activeTab === tab.id
                                        ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                                        : "bg-muted text-muted-foreground"
                                )}>
                                    {tab.count}
                                </span>
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* --- CONTENT --- */}
            <div className="min-h-[400px]">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeTab}
                        variants={tabVariants}
                        initial="enter"
                        animate="center"
                        exit="exit"
                        transition={{ duration: 0.2 }}
                    >
                        {/* OVERVIEW TAB */}
                        {activeTab === "overview" && (
                            <div className="max-w-4xl space-y-6">
                                {/* Stats Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/30 border-indigo-100 dark:border-indigo-900/30">
                                        <CardContent className="p-5">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 rounded-xl bg-indigo-100 dark:bg-indigo-900/50">
                                                    <Users className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
                                                </div>
                                                <div>
                                                    <p className="text-2xl font-bold">{memberCount}</p>
                                                    <p className="text-xs text-muted-foreground">Members</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30 border-emerald-100 dark:border-emerald-900/30">
                                        <CardContent className="p-5">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-900/50">
                                                    <Archive className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                                                </div>
                                                <div>
                                                    <p className="text-2xl font-bold">{projectCount}</p>
                                                    <p className="text-xs text-muted-foreground">Projects</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30 border-amber-100 dark:border-amber-900/30">
                                        <CardContent className="p-5">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 rounded-xl bg-amber-100 dark:bg-amber-900/50">
                                                    <Shield className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                                                </div>
                                                <div>
                                                    <p className="text-2xl font-bold">{boardCount}</p>
                                                    <p className="text-xs text-muted-foreground">Boards</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                    <Card className="bg-gradient-to-br from-violet-50 to-pink-50 dark:from-violet-950/30 dark:to-pink-950/30 border-violet-100 dark:border-violet-900/30">
                                        <CardContent className="p-5">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2.5 rounded-xl bg-violet-100 dark:bg-violet-900/50">
                                                    <Activity className="h-5 w-5 text-violet-600 dark:text-violet-400" />
                                                </div>
                                                <div>
                                                    <p className="text-2xl font-bold">{activities?.length || 0}</p>
                                                    <p className="text-xs text-muted-foreground">Activities</p>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Trust & Security + Recent Activity */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-sm flex items-center gap-2">
                                                <ShieldCheck className="h-4 w-4 text-emerald-600" />
                                                Trust & Security
                                            </CardTitle>
                                            <CardDescription className="text-xs">Team integrity signals and member verification</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="flex items-center justify-between py-2 border-b">
                                                <span className="text-sm text-muted-foreground">Team Created</span>
                                                <span className="text-sm font-medium flex items-center gap-1.5">
                                                    <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                                                    {team.createdAt ? format(new Date(team.createdAt), "MMM d, yyyy") : "N/A"}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between py-2 border-b">
                                                <span className="text-sm text-muted-foreground">Owner</span>
                                                <span className="text-sm font-medium flex items-center gap-1.5">
                                                    <Crown className="h-3.5 w-3.5 text-amber-500" />
                                                    {members?.find((m: any) => m.role === "owner")?.user?.name || "Unknown"}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between py-2 border-b">
                                                <span className="text-sm text-muted-foreground">Admins</span>
                                                <span className="text-sm font-medium">
                                                    {members?.filter((m: any) => m.role === "admin").length || 0}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between py-2 border-b">
                                                <span className="text-sm text-muted-foreground">Online Now</span>
                                                <span className="text-sm font-medium flex items-center gap-1.5">
                                                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                                    {members?.filter((m: any) => m.user?.lastActiveAt && new Date(m.user.lastActiveAt).getTime() > Date.now() - 300000).length || 0}
                                                    {" / "}{memberCount}
                                                </span>
                                            </div>
                                            <div className="flex items-center justify-between py-2">
                                                <span className="text-sm text-muted-foreground">Verification</span>
                                                <span className="text-sm font-medium flex items-center gap-1.5">
                                                    <Fingerprint className="h-3.5 w-3.5 text-indigo-500" />
                                                    {members?.filter((m: any) => m.user?.emailVerified).length || 0} verified
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader>
                                            <CardTitle className="text-sm flex items-center gap-2">
                                                <Sparkles className="h-4 w-4 text-amber-500" />
                                                Recent Activity
                                            </CardTitle>
                                            <CardDescription className="text-xs">Latest team actions at a glance</CardDescription>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-3">
                                                {activities?.slice(0, 5).map((activity: any) => (
                                                    <div key={activity.id} className="flex items-start gap-3 text-sm">
                                                        <div className="h-7 w-7 rounded-full bg-muted border flex items-center justify-center shrink-0 mt-0.5">
                                                            {activity.user?.imageUrl ? (
                                                                <Image src={activity.user.imageUrl} alt="" width={28} height={28} className="h-full w-full object-cover rounded-full" />
                                                            ) : (
                                                                <Activity className="h-3.5 w-3.5 text-muted-foreground" />
                                                            )}
                                                        </div>
                                                        <div className="min-w-0 flex-1">
                                                            <p className="truncate">
                                                                <span className="font-medium">{activity.user?.name || "User"}</span>
                                                                {" "}<span className="capitalize text-muted-foreground">{activity.action}</span>
                                                                {" "}{activity.entityType?.replace(/_/g, " ")}
                                                            </p>
                                                            <p className="text-[10px] text-muted-foreground">
                                                                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                                                            </p>
                                                        </div>
                                                    </div>
                                                ))}
                                                {(!activities || activities.length === 0) && (
                                                    <p className="text-sm text-muted-foreground italic text-center py-6">No recent activity</p>
                                                )}
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                {/* Member Roles Distribution */}
                                <Card>
                                    <CardHeader>
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            <UserCog className="h-4 w-4 text-muted-foreground" />
                                            Member Role Distribution
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="grid grid-cols-3 gap-4">
                                            {[
                                                { role: "Owner", count: members?.filter((m: any) => m.role === "owner").length || 0, color: "bg-amber-500", icon: Crown, light: "bg-amber-50 dark:bg-amber-950/30" },
                                                { role: "Admins", count: members?.filter((m: any) => m.role === "admin").length || 0, color: "bg-indigo-500", icon: Shield, light: "bg-indigo-50 dark:bg-indigo-950/30" },
                                                { role: "Members", count: members?.filter((m: any) => m.role === "member").length || 0, color: "bg-emerald-500", icon: Users, light: "bg-emerald-50 dark:bg-emerald-950/30" },
                                            ].map(({ role, count, color, icon: Icon, light }) => (
                                                <div key={role} className={`${light} rounded-xl p-4 border`}>
                                                    <div className="flex items-center justify-between mb-2">
                                                        <Icon className={`h-4 w-4 ${color.replace("bg-", "text-")}`} />
                                                        <span className="text-lg font-bold">{count}</span>
                                                    </div>
                                                    <p className="text-xs text-muted-foreground">{role}</p>
                                                    <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                                                        <div className={`h-full rounded-full ${color} transition-all`} style={{ width: `${memberCount > 0 ? (count / memberCount) * 100 : 0}%` }} />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* MEMBERS TAB */}
                        {activeTab === "members" && (
                            <div className="space-y-6">
                                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                                    <div className="relative max-w-md w-full">
                                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                        <Input
                                            placeholder="Search members by name or email..."
                                            className="pl-10 h-11 bg-background border rounded-xl"
                                            value={memberSearch}
                                            onChange={(e) => setMemberSearch(e.target.value)}
                                        />
                                    </div>
                                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                        <span className="flex items-center gap-1.5">
                                            <span className="h-2 w-2 rounded-full bg-emerald-500" />
                                            {activeCount} online
                                        </span>
                                        <span className="text-border">|</span>
                                        <span className="flex items-center gap-1.5">
                                            <Users className="h-3.5 w-3.5" />
                                            {memberCount} total
                                        </span>
                                    </div>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                    {memberList.filter((m: any) =>
                                        (m.user?.name || "").toLowerCase().includes(memberSearch.toLowerCase()) ||
                                        (m.user?.email || "").toLowerCase().includes(memberSearch.toLowerCase())
                                    ).map((member: any) => (
                                        <motion.div
                                            key={member.id}
                                            layout
                                            initial={{ opacity: 0, y: 8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="group flex items-center justify-between p-4 bg-card rounded-xl border hover:shadow-md hover:border-primary/20 transition-all"
                                        >
                                            <div className="flex items-center gap-4 min-w-0">
                                                <div className="relative shrink-0">
                                                    <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-100 to-purple-100 dark:from-indigo-900/30 dark:to-purple-900/30 flex items-center justify-center font-bold text-lg overflow-hidden ring-2 ring-background">
                                                        {member.user?.imageUrl ? (
                                                            <Image src={member.user.imageUrl} alt={member.user.name || "Member"} width={48} height={48} className="h-full w-full object-cover" />
                                                        ) : (
                                                            <span className="text-indigo-600 dark:text-indigo-400">
                                                                {member.user?.name?.[0] || "?"}
                                                            </span>
                                                        )}
                                                    </div>
                                                    <span className={cn(
                                                        "absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full border-2 border-card",
                                                        member.isOnline ? "bg-emerald-500" : "bg-slate-400"
                                                    )}>
                                                        {member.isOnline && (
                                                            <span className="absolute inset-0 rounded-full bg-emerald-500 animate-ping opacity-30" />
                                                        )}
                                                    </span>
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <p className="font-semibold text-foreground truncate">
                                                            {member.user?.name || "Unknown"}
                                                        </p>
                                                        {member.role === "owner" && <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                                                        {member.role === "admin" && <Shield className="h-3 w-3 text-indigo-500 shrink-0" />}
                                                    </div>
                                                    <p className="text-sm text-muted-foreground truncate">{member.user?.email}</p>
                                                    <div className="flex items-center gap-2 mt-1">
                                                        <span className={cn(
                                                            "text-[10px] font-medium flex items-center gap-1",
                                                            member.isOnline ? "text-emerald-600" : "text-slate-400"
                                                        )}>
                                                            {member.isOnline ? (
                                                                <><Wifi className="h-2.5 w-2.5" /> Online now</>
                                                            ) : (
                                                                <><WifiOff className="h-2.5 w-2.5" /> Offline</>
                                                            )}
                                                        </span>
                                                        {member.user?.lastActiveAt && !member.isOnline && (
                                                            <span className="text-[10px] text-muted-foreground">
                                                                · {formatDistanceToNow(new Date(member.user.lastActiveAt), { addSuffix: true })}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-3 shrink-0">
                                                <div className="text-right hidden sm:block">
                                                    <Badge className={cn(
                                                        "uppercase text-[10px] font-bold px-2.5 py-0.5",
                                                        member.role === "admin" || member.role === "owner"
                                                            ? "bg-indigo-500/10 text-indigo-600 border-indigo-500/20"
                                                            : "bg-muted text-muted-foreground border"
                                                    )} variant="outline">
                                                        {member.role === "owner" && <Crown className="h-2.5 w-2.5 mr-1" />}
                                                        {member.role}
                                                    </Badge>
                                                </div>

                                                {isAdmin && member.userId !== team.userId && (
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {member.role !== "owner" && (
                                                            <select
                                                                className="h-8 text-xs border rounded-lg bg-background px-2 py-1"
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
                                                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg"
                                                            onClick={() => {
                                                                showConfirm({
                                                                    title: "Remove Member",
                                                                    description: `Are you sure you want to remove ${member.user?.name || "this member"} from the team?`,
                                                                    actionLabel: "Remove",
                                                                    destructive: true,
                                                                    onAction: () => removeMemberMutation.mutate(member.userId)
                                                                });
                                                            }}
                                                        >
                                                            <LogOut className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                )}
                                            </div>
                                        </motion.div>
                                    ))}
                                    {memberList.filter((m: any) =>
                                        (m.user?.name || "").toLowerCase().includes(memberSearch.toLowerCase()) ||
                                        (m.user?.email || "").toLowerCase().includes(memberSearch.toLowerCase())
                                    ).length === 0 && (
                                        <div className="text-center py-12 text-muted-foreground italic">
                                            No members match your search.
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* PROJECTS TAB */}
                        {activeTab === "projects" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {isLoadingProjects ? (
                                    [1, 2, 3].map(i => <Card key={i} className="h-48 animate-pulse" />)
                                ) : projectCount > 0 ? (
                                    projects.map((project: any) => (
                                        <Link key={project.id} href={`/projects/${project.id}`} className="group">
                                            <Card className="h-full hover:shadow-lg transition-all border overflow-hidden cursor-pointer relative">
                                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                {project.coverImage && (
                                                    <div className="h-32 w-full relative">
                                                        <Image src={project.coverImage} alt={project.name} fill className="object-cover" />
                                                    </div>
                                                )}
                                                <CardHeader>
                                                    <div className="flex items-center gap-3">
                                                        <div className="h-9 w-9 rounded-xl bg-indigo-500/10 flex items-center justify-center">
                                                            <Archive className="h-4 w-4 text-indigo-500" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <CardTitle className="text-base group-hover:text-indigo-600 transition-colors truncate">{project.name}</CardTitle>
                                                            <CardDescription className="line-clamp-1">{project.description || "No description"}</CardDescription>
                                                        </div>
                                                    </div>
                                                </CardHeader>
                                            </Card>
                                        </Link>
                                    ))
                                ) : (
                                    <div className="col-span-full py-20 text-center bg-muted/30 border-2 border-dashed rounded-3xl">
                                        <Archive className="h-12 w-12 mx-auto text-muted-foreground/30 mb-4" />
                                        <p className="text-muted-foreground font-medium">No projects associated with this team yet.</p>
                                        <p className="text-xs text-muted-foreground/60 mt-2">Link this team to a project to get started.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* BOARDS TAB */}
                        {activeTab === "boards" && (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {isLoadingBoards ? (
                                    [1, 2, 3].map(i => <Card key={i} className="h-40 animate-pulse" />)
                                ) : boardCount > 0 ? (
                                    boards.map((board: any) => (
                                        <Link key={board.id} href={`/boards/${board.id}`} className="group">
                                            <Card className="h-full hover:shadow-xl transition-all cursor-pointer relative overflow-hidden">
                                                <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                                <CardHeader>
                                                    <div className="flex items-center justify-between mb-1">
                                                        <Badge className="bg-indigo-500/10 text-indigo-600 border-none uppercase text-[10px] tracking-widest">{board.project?.name}</Badge>
                                                        <Shield className="h-4 w-4 text-muted-foreground/40 group-hover:text-indigo-500 transition-colors" />
                                                    </div>
                                                    <CardTitle className="text-lg group-hover:text-indigo-600 transition-colors">{board.name}</CardTitle>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                                        <span className="flex items-center gap-1.5">
                                                            <Activity className="h-3.5 w-3.5" />
                                                            {board._count?.tasks || 0} tasks
                                                        </span>
                                                        <span className="flex items-center gap-1.5">
                                                            <Hash className="h-3.5 w-3.5" />
                                                            {board.columns?.length || 0} columns
                                                        </span>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        </Link>
                                    ))
                                ) : (
                                    <div className="col-span-full py-12 text-center bg-muted/30 border-2 border-dashed rounded-3xl">
                                        <Shield className="h-10 w-10 mx-auto text-muted-foreground/30 mb-4" />
                                        <p className="text-muted-foreground font-medium">No boards found in team projects.</p>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* CHAT TAB */}
                        {activeTab === "chat" && (
                            <div className="bg-card rounded-2xl border shadow-sm h-[600px] overflow-hidden">
                                <TeamChat teamId={team.id} workspaceId={team.workspaceId} />
                            </div>
                        )}

                        {/* INVITES TAB */}
                        {activeTab === "invites" && (
                            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                                <div className="lg:col-span-2 space-y-6">
                                    <Card>
                                        <CardHeader>
                                            <CardTitle>Invite New Members</CardTitle>
                                            <CardDescription>Enter one or multiple email addresses separated by commas.</CardDescription>
                                        </CardHeader>
                                        <CardContent className="space-y-4">
                                            <div className="flex flex-col gap-3">
                                                <div className="relative">
                                                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                    <Input
                                                        placeholder="e.g. alice@co.com, bob@co.com, carol@co.com"
                                                        value={inviteEmail}
                                                        onChange={e => setInviteEmail(e.target.value)}
                                                        className="pl-10 h-11 rounded-xl"
                                                    />
                                                </div>
                                                {parsedEmails.length > 0 && (
                                                    <div className="flex flex-wrap gap-2">
                                                        {parsedEmails.map(email => (
                                                            <span key={email} className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 text-xs font-medium rounded-full border border-indigo-100 dark:border-indigo-800">
                                                                <Mail className="h-3 w-3" />
                                                                {email}
                                                            </span>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="flex gap-3">
                                                    <div className="relative">
                                                        <select
                                                            className="h-11 rounded-xl border border-input bg-background px-4 py-2 text-sm appearance-none pr-8"
                                                            value={inviteRole}
                                                            onChange={e => setInviteRole(e.target.value)}
                                                        >
                                                            <option value="member">Member</option>
                                                            <option value="admin">Admin</option>
                                                        </select>
                                                        <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                                                    </div>
                                                    <Button
                                                        className="flex-1 h-11 rounded-xl"
                                                        onClick={() => inviteMutation.mutate()}
                                                        disabled={parsedEmails.length === 0 || inviteMutation.isPending}
                                                    >
                                                        {inviteMutation.isPending ? (
                                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                        ) : (
                                                            <UserPlus className="mr-2 h-4 w-4" />
                                                        )}
                                                        {parsedEmails.length > 1
                                                            ? `Send ${parsedEmails.length} Invites`
                                                            : "Send Invite"}
                                                    </Button>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <div className="space-y-4">
                                        <div className="flex items-center justify-between">
                                            <h3 className="font-semibold text-sm text-muted-foreground uppercase">Pending Invitations</h3>
                                            {invites && invites.length > 0 && (
                                                <Badge variant="outline" className="text-xs">
                                                    {invites.length} pending
                                                </Badge>
                                            )}
                                        </div>
                                        {invites?.map((invite: any) => {
                                            const expiresAt = new Date(invite.expiresAt);
                                            const now = new Date();
                                            const daysLeft = Math.ceil((expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                                            const isExpiringSoon = invite.status === "pending" && daysLeft <= 2 && daysLeft > 0;
                                            const isExpired = daysLeft <= 0 && !invite.acceptedAt;
                                            return (
                                                <div key={invite.id} className="flex items-center justify-between p-4 border rounded-xl bg-card/50">
                                                    <div className="flex items-center gap-3 min-w-0">
                                                        <div className="h-9 w-9 rounded-full bg-muted border flex items-center justify-center shrink-0">
                                                            <Mail className="h-4 w-4 text-muted-foreground" />
                                                        </div>
                                                        <div className="min-w-0">
                                                            <p className="font-medium text-sm truncate">{invite.email}</p>
                                                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                                                <span>{format(new Date(invite.createdAt), "MMM d, yyyy")}</span>
                                                                <span>•</span>
                                                                <span className="capitalize">{invite.role}</span>
                                                                {isExpiringSoon && (
                                                                    <span className="text-amber-600 font-semibold">• Expires in {daysLeft}d</span>
                                                                )}
                                                                {isExpired && (
                                                                    <span className="text-red-500 font-semibold">• Expired</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2 shrink-0">
                                                        <Badge variant="outline" className={
                                                            invite.status === "pending" ? "text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-950/20" :
                                                                invite.status === "revoked" ? "text-red-600 bg-red-50 dark:bg-red-950/20" : ""
                                                        }>
                                                            {invite.status}
                                                        </Badge>
                                                        {isAdmin && invite.status === "pending" && (
                                                            <div className="flex items-center gap-1">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 h-8 text-xs"
                                                                    disabled={resendInviteMutation.isPending}
                                                                    onClick={() => resendInviteMutation.mutate(invite.id)}
                                                                >
                                                                    {resendInviteMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Resend"}
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 h-8 text-xs"
                                                                    onClick={() => revokeInviteMutation.mutate(invite.id)}
                                                                >
                                                                    Revoke
                                                                </Button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                        {(!invites || invites.length === 0) && (
                                            <div className="text-center py-10 text-muted-foreground italic bg-muted/20 rounded-xl border border-dashed">
                                                <Mail className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                                                No pending invitations
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <Card className="bg-gradient-to-br from-indigo-50 to-purple-50 dark:from-slate-900 dark:to-slate-900 border-indigo-100 dark:border-slate-800">
                                        <CardHeader>
                                            <CardTitle className="text-indigo-900 dark:text-indigo-200 text-sm">Pro Tip</CardTitle>
                                            <CardDescription className="text-indigo-700/70 dark:text-indigo-300/70 text-xs">
                                                You can invite multiple people at once by separating their email addresses with commas.
                                                Admins can manage roles and remove members at any time.
                                            </CardDescription>
                                        </CardHeader>
                                    </Card>
                                    <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-slate-900 dark:to-slate-900 border-emerald-100 dark:border-slate-800">
                                        <CardHeader>
                                            <CardTitle className="text-emerald-900 dark:text-emerald-200 text-sm">Quick Actions</CardTitle>
                                            <CardContent className="px-0 pt-4 space-y-2">
                                                <Button variant="outline" size="sm" className="w-full justify-start rounded-lg text-xs" onClick={copyInviteLink}>
                                                    <Link2 className="h-3.5 w-3.5 mr-2" />
                                                    Copy Invite Link
                                                </Button>
                                                <Button variant="outline" size="sm" className="w-full justify-start rounded-lg text-xs" onClick={() => setActiveTab("chat")}>
                                                    <MessageSquare className="h-3.5 w-3.5 mr-2" />
                                                    Open Team Chat
                                                </Button>
                                            </CardContent>
                                        </CardHeader>
                                    </Card>
                                </div>
                            </div>
                        )}

                        {/* ACTIVITY TAB */}
                        {activeTab === "activity" && (
                            <div className="max-w-3xl">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Team Activity</CardTitle>
                                        <CardDescription>Recent actions and updates within this team.</CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="space-y-6 relative before:absolute before:inset-0 before:ml-5 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
                                            {activities?.map((activity: any) => (
                                                <div key={activity.id} className="relative flex items-start gap-6">
                                                    <div className="relative z-10 flex items-center justify-center w-10 h-10 rounded-full border bg-background shadow-sm shrink-0">
                                                        {activity.user?.imageUrl ? (
                                                            <Image src={activity.user.imageUrl} alt={activity.user.name || "User"} width={40} height={40} className="h-full w-full object-cover rounded-full" />
                                                        ) : (
                                                            <Activity className="h-5 w-5 text-muted-foreground" />
                                                        )}
                                                    </div>
                                                    <div className="flex-1 min-w-0 p-4 rounded-xl border bg-card/50">
                                                        <div className="flex items-center justify-between gap-2 mb-1">
                                                            <div className="font-semibold text-sm text-foreground truncate">
                                                                {activity.user?.name || "User"}
                                                            </div>
                                                            <time className="text-[10px] text-muted-foreground shrink-0">
                                                                {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                                                            </time>
                                                        </div>
                                                        <div className="text-sm text-muted-foreground">
                                                            <span className="font-medium text-foreground capitalize">{activity.action}</span>
                                                            {" "}{activity.entityType?.replace(/_/g, " ")}
                                                            {activity.metadata?.details && (
                                                                <span className="block text-xs text-muted-foreground/70 mt-0.5 italic">
                                                                    {activity.metadata.details}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                            {(!activities || activities.length === 0) && (
                                                <div className="flex flex-col items-center py-12 text-muted-foreground">
                                                    <Activity className="h-10 w-10 mb-3 text-muted-foreground/30" />
                                                    <p className="italic">No recent activity recorded.</p>
                                                </div>
                                            )}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}

                        {/* SETTINGS TAB */}
                        {activeTab === "settings" && (
                            <div className="max-w-2xl space-y-8">
                                <Card>
                                    <CardHeader>
                                        <CardTitle>Team Settings</CardTitle>
                                        <CardDescription>Manage general team information.</CardDescription>
                                    </CardHeader>
                                    <CardContent className="space-y-5">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Team Name</label>
                                            <Input value={editName} onChange={e => setEditName(e.target.value)} disabled={!isAdmin} className="rounded-xl h-11" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Description</label>
                                            <Textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} disabled={!isAdmin} className="rounded-xl" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Status</label>
                                                <select
                                                    className="w-full h-11 rounded-xl border border-input bg-background px-3 py-2 text-sm"
                                                    value={editStatus}
                                                    onChange={e => setEditStatus(e.target.value)}
                                                    disabled={!isAdmin}
                                                >
                                                    <option value="active">Active</option>
                                                    <option value="archived">Archived</option>
                                                </select>
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Default Role</label>
                                                <select
                                                    className="w-full h-11 rounded-xl border border-input bg-background px-3 py-2 text-sm"
                                                    value={editDefaultRole}
                                                    onChange={e => setEditDefaultRole(e.target.value)}
                                                    disabled={!isAdmin}
                                                >
                                                    <option value="member">Member</option>
                                                    <option value="admin">Admin</option>
                                                    <option value="guest">Guest</option>
                                                </select>
                                            </div>
                                        </div>
                                        <p className="text-[10px] text-muted-foreground">Default role is assigned to users joining via generic team links.</p>
                                    </CardContent>
                                    {isAdmin && (
                                        <CardFooter className="flex justify-between border-t pt-6">
                                            <Button
                                                variant="destructive"
                                                disabled={!isOwner}
                                                onClick={() => {
                                                    showConfirm({
                                                        title: "Total Annihilation",
                                                        description: `You are about to permanently delete the team "${team.name}". This action cannot be reversed and all associated tasks, chats, and data will be lost.`,
                                                        actionLabel: "Confirm Deletion",
                                                        destructive: true,
                                                        onAction: () => deleteTeamMutation.mutate()
                                                    });
                                                }}
                                                className="rounded-xl"
                                            >
                                                <Trash2 className="mr-2 h-4 w-4" /> Delete Team
                                            </Button>

                                            <Button onClick={() => updateTeamMutation.mutate({
                                                name: editName,
                                                description: editDescription,
                                                status: editStatus,
                                                defaultRole: editDefaultRole
                                            })} className="rounded-xl shadow-sm">
                                                <BadgeCheck className="mr-2 h-4 w-4" /> Save Changes
                                            </Button>
                                        </CardFooter>
                                    )}
                                </Card>

                                {/* Permissions Matrix */}
                                <Card className="border-indigo-100 bg-indigo-50/20 dark:bg-indigo-950/10 dark:border-indigo-900/30">
                                    <CardHeader>
                                        <CardTitle className="text-sm flex items-center gap-2">
                                            <Shield className="h-4 w-4 text-indigo-600" />
                                            Team Permissions Matrix
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-xs space-y-1">
                                            {[
                                                { action: "Invite Members", who: "Admins, Owners" },
                                                { action: "Manage Roles", who: "Owners, Workspace Admins" },
                                                { action: "Delete Team", who: "Owners Only", danger: true },
                                                { action: "Team Chat", who: "All Members" },
                                                { action: "View Projects & Boards", who: "All Members" },
                                            ].map((perm) => (
                                                <div key={perm.action} className="grid grid-cols-2 py-2.5 border-b last:border-0">
                                                    <span className="text-muted-foreground">{perm.action}</span>
                                                    <span className={cn("font-medium", perm.danger && "text-red-600")}>{perm.who}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </CardContent>
                                </Card>
                            </div>
                        )}
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
