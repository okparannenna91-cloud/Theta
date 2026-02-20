"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tag as TagIcon, Plus, Check, X, Loader2, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Tag {
    id: string;
    name: string;
    color: string;
}

interface TaskTag {
    id: string;
}

interface TagSelectorProps {
    taskId: string;
    workspaceId: string;
    currentTagIds: string[];
}

const COLORS = [
    "#4f46e5", // Indigo
    "#ef4444", // Red
    "#f59e0b", // Amber
    "#10b981", // Emerald
    "#06b6d4", // Cyan
    "#8b5cf6", // Violet
    "#ec4899", // Pink
    "#64748b", // Slate
];

export function TagSelector({ taskId, workspaceId, currentTagIds }: TagSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [newTagName, setNewTagName] = useState("");
    const [selectedColor, setSelectedColor] = useState(COLORS[0]);
    const [isCreating, setIsCreating] = useState(false);
    const queryClient = useQueryClient();

    const { data: allTags, isLoading: isLoadingTags } = useQuery<Tag[]>({
        queryKey: ["workspace-tags", workspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/workspaces/${workspaceId}/tags`);
            if (!res.ok) throw new Error("Failed to fetch tags");
            return res.json();
        },
    });

    const createTagMutation = useMutation({
        mutationFn: async (data: { name: string; color: string }) => {
            const res = await fetch(`/api/workspaces/${workspaceId}/tags`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to create tag");
            }
            return res.json();
        },
        onSuccess: (newTag) => {
            queryClient.invalidateQueries({ queryKey: ["workspace-tags", workspaceId] });
            setNewTagName("");
            setIsCreating(false);
            toast.success("Tag created");
            // Optionally auto-assign after creation
            toggleTagMutation.mutate({ tagId: newTag.id, action: "assign" });
        },
        onError: (error: any) => {
            toast.error(error.message);
        },
    });

    const toggleTagMutation = useMutation({
        mutationFn: async ({ tagId, action }: { tagId: string; action: "assign" | "unassign" }) => {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    tagIds: action === "assign"
                        ? [...currentTagIds, tagId]
                        : currentTagIds.filter(id => id !== tagId)
                }),
            });
            if (!res.ok) throw new Error("Failed to update task tags");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["tasks", taskId] });
            queryClient.invalidateQueries({ queryKey: ["kanban-board"] }); // Refresh boards if open
        },
    });

    const handleCreateTag = (e: React.FormEvent) => {
        e.preventDefault();
        if (!newTagName.trim()) return;
        createTagMutation.mutate({ name: newTagName, color: selectedColor });
    };

    const isAssigned = (tagId: string) => currentTagIds.includes(tagId);

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2">
                <TagIcon className="h-4 w-4 text-emerald-500" />
                <h3 className="text-sm font-semibold tracking-tight">Tags</h3>
            </div>

            <div className="flex flex-wrap gap-2">
                {allTags?.filter(tag => isAssigned(tag.id)).map(tag => (
                    <Badge
                        key={tag.id}
                        style={{ backgroundColor: `${tag.color}20`, color: tag.color, borderColor: `${tag.color}40` }}
                        className="flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider border transition-all hover:opacity-80 group cursor-pointer"
                        onClick={() => toggleTagMutation.mutate({ tagId: tag.id, action: "unassign" })}
                    >
                        {tag.name}
                        <X className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Badge>
                ))}

                <Popover open={isOpen} onOpenChange={setIsOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            size="sm"
                            className="h-7 border-dashed border-2 px-2 text-[10px] gap-1 hover:bg-emerald-50 dark:hover:bg-emerald-900/10 hover:border-emerald-500/50 hover:text-emerald-600 transition-all font-bold uppercase tracking-wider"
                        >
                            <Plus className="h-3 w-3" />
                            Add Tag
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-64 p-3" align="start">
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <span className="text-xs font-bold uppercase tracking-tight text-muted-foreground underline decoration-emerald-500/30 underline-offset-4">Select or Create Tag</span>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setIsOpen(false)}>
                                    <X className="h-4 w-4" />
                                </Button>
                            </div>

                            {!isCreating ? (
                                <div className="space-y-1 max-h-48 overflow-y-auto custom-scrollbar pr-1">
                                    {allTags?.length === 0 && (
                                        <p className="text-[10px] text-muted-foreground text-center py-4">No tags created yet.</p>
                                    )}
                                    {allTags?.map(tag => (
                                        <button
                                            key={tag.id}
                                            onClick={() => toggleTagMutation.mutate({
                                                tagId: tag.id,
                                                action: isAssigned(tag.id) ? "unassign" : "assign"
                                            })}
                                            className={cn(
                                                "w-full flex items-center justify-between p-2 rounded-lg text-xs font-medium transition-all",
                                                isAssigned(tag.id) ? "bg-accent" : "hover:bg-accent/50"
                                            )}
                                        >
                                            <div className="flex items-center gap-2">
                                                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: tag.color }} />
                                                {tag.name}
                                            </div>
                                            {isAssigned(tag.id) && <Check className="h-3.5 w-3.5 text-indigo-600" />}
                                        </button>
                                    ))}
                                    <Button
                                        variant="ghost"
                                        className="w-full justify-start text-[10px] font-bold text-indigo-600 gap-2 h-8 mt-2"
                                        onClick={() => setIsCreating(true)}
                                    >
                                        <Plus className="h-3 w-3" /> Create New Tag
                                    </Button>
                                </div>
                            ) : (
                                <form onSubmit={handleCreateTag} className="space-y-4 animate-in fade-in slide-in-from-top-2">
                                    <Input
                                        placeholder="Tag name..."
                                        value={newTagName}
                                        onChange={(e) => setNewTagName(e.target.value)}
                                        className="h-8 text-xs font-semibold focus:ring-emerald-500"
                                        autoFocus
                                    />
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-[10px] font-bold text-muted-foreground">
                                            <Palette className="h-3 w-3" /> Select Color
                                        </div>
                                        <div className="grid grid-cols-4 gap-2">
                                            {COLORS.map(color => (
                                                <button
                                                    key={color}
                                                    type="button"
                                                    onClick={() => setSelectedColor(color)}
                                                    className={cn(
                                                        "h-6 rounded-md transition-all",
                                                        selectedColor === color ? "ring-2 ring-emerald-500 ring-offset-2 scale-110" : "hover:scale-105"
                                                    )}
                                                    style={{ backgroundColor: color }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="sm"
                                            className="flex-1 h-8 text-[10px] font-bold"
                                            onClick={() => setIsCreating(false)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button
                                            type="submit"
                                            size="sm"
                                            className="flex-1 h-8 text-[10px] font-bold bg-indigo-600 hover:bg-indigo-700"
                                            disabled={!newTagName.trim() || createTagMutation.isPending}
                                        >
                                            {createTagMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : "Create"}
                                        </Button>
                                    </div>
                                </form>
                            )}
                        </div>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
}
