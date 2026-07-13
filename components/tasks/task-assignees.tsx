"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Users, Plus, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface WorkspaceMember {
    id: string;
    name: string | null;
    email: string | null;
    imageUrl: string | null;
}

interface TaskAssigneesProps {
    assigneeIds: string[];
    workspaceId: string;
    onUpdate: (ids: string[]) => void;
}

export function TaskAssignees({ assigneeIds, workspaceId, onUpdate }: TaskAssigneesProps) {
    const [search, setSearch] = useState("");
    const [open, setOpen] = useState(false);

    const { data: members, isLoading } = useQuery<WorkspaceMember[]>({
        queryKey: ["members", workspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/workspaces/${workspaceId}/members`);
            if (!res.ok) throw new Error("Failed to fetch members");
            return res.json();
        },
        enabled: !!workspaceId,
    });

    const assignees = assigneeIds
        .map((id) => members?.find((m) => m.id === id))
        .filter(Boolean) as WorkspaceMember[];

    const availableMembers = members?.filter(
        (m) =>
            !assigneeIds.includes(m.id) &&
            (m.name?.toLowerCase().includes(search.toLowerCase()) ||
                m.email?.toLowerCase().includes(search.toLowerCase()))
    );

    const handleAdd = (memberId: string) => {
        onUpdate([...assigneeIds, memberId]);
        setSearch("");
        setOpen(false);
    };

    const handleRemove = (memberId: string) => {
        onUpdate(assigneeIds.filter((id) => id !== memberId));
    };

    if (isLoading) {
        return (
            <div className="flex items-center gap-2 p-2">
                <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                <span className="text-xs text-muted-foreground">Loading members...</span>
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-indigo-500" />
                <span className="text-xs font-medium text-muted-foreground">Assignees</span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
                {assignees.map((member) => (
                    <div
                        key={member.id}
                        className="group flex items-center gap-1.5 bg-accent/50 border border-slate-200 dark:border-slate-800 rounded-full pl-1 pr-2 py-0.5"
                    >
                        <Avatar className="h-6 w-6">
                            <AvatarImage src={member.imageUrl || ""} />
                            <AvatarFallback className="text-[10px]">
                                {member.name?.[0] || "U"}
                            </AvatarFallback>
                        </Avatar>
                        <span className="text-xs font-medium max-w-[100px] truncate">
                            {member.name || "Anonymous"}
                        </span>
                        <button
                            onClick={() => handleRemove(member.id)}
                            className="h-4 w-4 text-muted-foreground hover:text-red-600 rounded-full hover:bg-red-50 dark:hover:bg-red-900/20 inline-flex items-center justify-center transition-colors opacity-0 group-hover:opacity-100"
                        >
                            <X className="h-3 w-3" />
                        </button>
                    </div>
                ))}

                <Popover open={open} onOpenChange={setOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 w-7 rounded-full p-0 border-dashed border-slate-300 dark:border-slate-700"
                        >
                            <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-2" align="start">
                        <div className="space-y-2">
                            <Input
                                placeholder="Search members..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="h-8 text-xs"
                            />
                            <div className="max-h-48 overflow-y-auto space-y-0.5">
                                {availableMembers?.length === 0 ? (
                                    <p className="text-xs text-muted-foreground text-center py-3">
                                        {search ? "No members found" : "All members assigned"}
                                    </p>
                                ) : (
                                    availableMembers?.map((member) => (
                                        <button
                                            key={member.id}
                                            onClick={() => handleAdd(member.id)}
                                            className="w-full flex items-center gap-2 px-2 py-1.5 hover:bg-accent rounded-md text-left transition-colors"
                                        >
                                            <Avatar className="h-6 w-6">
                                                <AvatarImage src={member.imageUrl || ""} />
                                                <AvatarFallback className="text-[10px]">
                                                    {member.name?.[0] || "U"}
                                                </AvatarFallback>
                                            </Avatar>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-xs font-medium truncate">
                                                    {member.name || "Anonymous"}
                                                </span>
                                                <span className="text-[10px] text-muted-foreground truncate">
                                                    {member.email}
                                                </span>
                                            </div>
                                        </button>
                                    ))
                                )}
                            </div>
                        </div>
                    </PopoverContent>
                </Popover>

                {assignees.length === 0 && (
                    <span className="text-xs text-muted-foreground italic">
                        No assignees
                    </span>
                )}
            </div>
        </div>
    );
}
