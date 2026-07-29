"use client";

import { useQuery } from "@tanstack/react-query";
import { useTeam } from "@/components/teams/team-context";
import { useWorkspace } from "@/hooks/use-workspace";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Search, Crown, Shield, User } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const roleIcon = { owner: Crown, admin: Shield, member: User };

export default function TeamMembersPage() {
  const team = useTeam();
  const { activeWorkspaceId } = useWorkspace();
  const [search, setSearch] = useState("");

  const { data: members, isLoading } = useQuery({
    queryKey: ["team-members", team.id, activeWorkspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/teams/${team.id}/members?workspaceId=${activeWorkspaceId}`);
      if (!res.ok) throw new Error("Failed to fetch members");
      return res.json();
    },
  });

  if (isLoading) {
    return <div className="p-6 space-y-4">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-xl" />)}</div>;
  }

  const filtered = members?.filter((m: any) =>
    m.user?.name?.toLowerCase().includes(search.toLowerCase()) ||
    m.user?.email?.toLowerCase().includes(search.toLowerCase())
  ) || [];

  return (
    <div className="p-6 space-y-4">
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search members..."
          className="pl-10 h-10 bg-background border rounded-xl text-xs"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        {filtered.map((m: any) => {
          const RoleIcon = roleIcon[m.role as keyof typeof roleIcon] || User;
          return (
            <div key={m.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-muted/50 transition-colors">
              <Avatar className="h-9 w-9 rounded-[10px]">
                <AvatarImage src={m.user?.imageUrl} />
                <AvatarFallback className="rounded-[10px] text-[10px]">{m.user?.name?.slice(0, 2)?.toUpperCase() || "??"}</AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{m.user?.name || "Unknown"}</span>
                  <RoleIcon className={cn("h-3.5 w-3.5", m.role === "owner" ? "text-amber-500" : m.role === "admin" ? "text-indigo-500" : "text-muted-foreground/40")} />
                </div>
                <p className="text-[10px] text-muted-foreground">{m.user?.email}</p>
              </div>
              <Badge variant="outline" className="text-[9px] rounded-full capitalize font-medium px-2 py-0 h-5 border-border/40">
                {m.role}
              </Badge>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <p className="text-sm text-muted-foreground text-center py-8">No members found</p>
        )}
      </div>
    </div>
  );
}
