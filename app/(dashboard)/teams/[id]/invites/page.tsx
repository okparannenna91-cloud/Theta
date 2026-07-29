"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTeam } from "@/components/teams/team-context";
import { useWorkspace } from "@/hooks/use-workspace";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { UserPlus, Copy, Check, X, Mail } from "lucide-react";
import { useState } from "react";
import { formatDistanceToNow } from "date-fns";

export default function TeamInvitesPage() {
  const team = useTeam();
  const { activeWorkspaceId } = useWorkspace();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);

  const { data: invites, isLoading } = useQuery({
    queryKey: ["team-invites", team.id, activeWorkspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/invites?workspaceId=${activeWorkspaceId}&teamId=${team.id}`);
      if (!res.ok) throw new Error("Failed to fetch invites");
      return res.json();
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (inviteId: string) => {
      const res = await fetch(`/api/invites/${inviteId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to revoke");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["team-invites", team.id] });
      toast.success("Invite revoked");
    },
  });

  const copyLink = () => {
    const link = `${window.location.origin}/invite?team=${team.id}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 max-w-2xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <UserPlus className="h-4 w-4" />
            Invite People
          </CardTitle>
          <CardDescription className="text-xs">Send invitations to join this team</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Input
              placeholder="Enter email address..."
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-10 text-sm rounded-xl flex-1"
            />
            <Button size="sm" className="rounded-xl text-xs" disabled={!email.includes("@")}>
              <Mail className="h-3.5 w-3.5 mr-1.5" />
              Send
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] text-muted-foreground">Or share invite link:</span>
            <Button variant="outline" size="sm" className="rounded-xl text-xs h-8" onClick={copyLink}>
              {copied ? <Check className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
              {copied ? "Copied!" : "Copy Link"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Pending Invitations</CardTitle>
          <CardDescription className="text-xs">{invites?.length || 0} pending</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading && <Skeleton className="h-10 w-full rounded-xl" />}
          {!isLoading && invites?.length === 0 && (
            <p className="text-sm text-muted-foreground text-center py-4">No pending invitations</p>
          )}
          {invites?.map((inv: any) => (
            <div key={inv.id} className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors">
              <div className="flex items-center gap-3 min-w-0">
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{inv.email}</p>
                  <p className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(inv.createdAt), { addSuffix: true })}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px] rounded-full capitalize">{inv.role || "member"}</Badge>
                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-lg text-muted-foreground hover:text-destructive" onClick={() => revokeMutation.mutate(inv.id)}>
                  <X className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
