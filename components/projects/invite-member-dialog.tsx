"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { 
    Dialog, 
    DialogContent, 
    DialogHeader, 
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { 
    Select, 
    SelectContent, 
    SelectItem, 
    SelectTrigger, 
    SelectValue 
} from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Mail, UserPlus } from "lucide-react";

interface InviteMemberDialogProps {
    isOpen: boolean;
    onOpenChange: (open: boolean) => void;
    workspaceId: string;
    teamId?: string;
}

export function InviteMemberDialog({
    isOpen,
    onOpenChange,
    workspaceId,
    teamId,
}: InviteMemberDialogProps) {
    const [email, setEmail] = useState("");
    const [role, setRole] = useState("member");
    const queryClient = useQueryClient();

    const inviteMutation = useMutation({
        mutationFn: async () => {
            const res = await fetch("/api/invites", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    workspaceId,
                    teamId,
                    email,
                    role,
                }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(json.error || "Failed to send invite");
            return json;
        },
        onSuccess: (data) => {
            if (data.inviteLink) {
                navigator.clipboard.writeText(data.inviteLink).then(() => {
                    toast.success(
                        `Invite created! Link copied to clipboard.`,
                        { description: data.inviteLink, duration: 8000 }
                    );
                }).catch(() => {
                    toast.success(
                        `Invite created!`,
                        { description: `Link: ${data.inviteLink}`, duration: 12000 }
                    );
                });
            } else {
                toast.success("Invite sent successfully");
            }
            setEmail("");
            onOpenChange(false);
            if (teamId) {
                queryClient.invalidateQueries({ queryKey: ["team-invites", teamId] });
            }
            queryClient.invalidateQueries({ queryKey: ["workspace-invites", workspaceId] });
        },
        onError: (err: any) => toast.error(err.message || "Failed to send invite"),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        inviteMutation.mutate();
    };

    return (
        <Dialog open={isOpen} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px] rounded-lg border-slate-200 dark:border-slate-800">
                <DialogHeader>
                    <div className="h-12 w-12 bg-primary rounded-lg flex items-center justify-center mb-4 shadow-sm">
                        <UserPlus className="h-6 w-6 text-primary-foreground" />
                    </div>
                    <DialogTitle className="text-2xl font-semibold tracking-tight">Expand the Team</DialogTitle>
                    <DialogDescription className="font-semibold text-xs text-primary">
                        Invite a new collaborator to this workspace.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 py-4">
                    <div className="space-y-2">
                        <Label htmlFor="email" className="text-xs font-semibold text-slate-500">Email Address</Label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                            <Input
                                id="email"
                                type="email"
                                placeholder="name@example.com"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="pl-10 h-12 rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 focus-visible:ring-primary font-semibold"
                                required
                            />
                        </div>
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="role" className="text-xs font-semibold text-slate-500">Permission Role</Label>
                        <Select value={role} onValueChange={setRole}>
                            <SelectTrigger className="h-12 rounded-lg border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 font-semibold">
                                <SelectValue placeholder="Select role" />
                            </SelectTrigger>
                            <SelectContent className="rounded-lg">
                                <SelectItem value="member" className="font-semibold">Member (Full Access)</SelectItem>
                                <SelectItem value="admin" className="font-semibold">Admin (Manage Settings)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <DialogFooter className="pt-4 gap-2">
                        <Button 
                            type="button" 
                            variant="ghost" 
                            onClick={() => onOpenChange(false)}
                            className="rounded-lg font-semibold text-xs"
                        >
                            Cancel
                        </Button>
                        <Button 
                            type="submit" 
                            disabled={!email || inviteMutation.isPending}
                            className="rounded-lg font-semibold text-xs h-12 px-8 shadow-sm"
                        >
                            {inviteMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                "Send Invitation"
                            )}
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
