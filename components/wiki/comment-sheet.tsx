"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
    MessageSquare, 
    Send, 
    X,
    User as UserIcon,
    Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface CommentSheetProps {
    documentId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function CommentSheet({ documentId, isOpen, onClose }: CommentSheetProps) {
    const queryClient = useQueryClient();
    const [newComment, setNewComment] = useState("");

    const { data: comments, isLoading } = useQuery({
        queryKey: ["document-comments", documentId],
        queryFn: async () => {
            const res = await fetch(`/api/docs/${documentId}/comments`);
            if (!res.ok) throw new Error("Failed to fetch comments");
            return res.json();
        },
        enabled: isOpen,
    });

    const submitMutation = useMutation({
        mutationFn: async (content: string) => {
            const res = await fetch(`/api/docs/${documentId}/comments`, {
                method: "POST",
                body: JSON.stringify({ content }),
            });
            if (!res.ok) throw new Error("Failed to post comment");
            return res.json();
        },
        onSuccess: () => {
            setNewComment("");
            queryClient.invalidateQueries({ queryKey: ["document-comments", documentId] });
        },
    });

    if (!isOpen) return null;

    return (
        <div className="fixed right-0 top-0 h-full w-96 bg-white dark:bg-slate-900 border-l border-slate-200 dark:border-white/10 z-[100] flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
                        <MessageSquare className="h-5 w-5" />
                    </div>
                    <div>
                        <h3 className="text-xs font-black uppercase tracking-widest">Collaborative Intel</h3>
                        <p className="text-[10px] font-bold text-muted-foreground opacity-50">Stream of Consciousness</p>
                    </div>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
                    <X className="h-5 w-5" />
                </Button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
                {isLoading ? (
                    <div className="flex items-center justify-center h-32">
                        <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                    </div>
                ) : comments?.length === 0 ? (
                    <div className="text-center py-20 grayscale opacity-20 space-y-4">
                        <MessageSquare className="h-12 w-12 mx-auto" />
                        <p className="text-[10px] font-black uppercase tracking-widest">No signals detected in this node.</p>
                    </div>
                ) : (
                    comments?.map((comment: any) => (
                        <div key={comment.id} className="group flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-500">
                            <Avatar className="h-10 w-10 rounded-xl border-2 border-white dark:border-slate-800 shadow-sm">
                                <AvatarImage src={comment.user.image} />
                                <AvatarFallback className="bg-indigo-100 text-indigo-600 font-black text-xs">
                                    {comment.user.name?.[0]}
                                </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase tracking-tight text-indigo-600">{comment.user.name}</span>
                                    <span className="text-[8px] font-bold text-muted-foreground uppercase">{formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}</span>
                                </div>
                                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-white/5 text-xs font-medium leading-relaxed">
                                    {comment.content}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <div className="p-6 border-t border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-slate-900/50">
                <form 
                    onSubmit={(e) => {
                        e.preventDefault();
                        if (newComment.trim()) submitMutation.mutate(newComment);
                    }}
                    className="relative"
                >
                    <Input 
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Inject intelligence..."
                        className="pr-12 h-14 rounded-2xl border-none shadow-xl bg-white dark:bg-slate-900 text-xs font-bold"
                    />
                    <Button 
                        type="submit"
                        disabled={!newComment.trim() || submitMutation.isPending}
                        className="absolute right-2 top-2 h-10 w-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-lg shadow-indigo-500/20 p-0"
                    >
                        {submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    </Button>
                </form>
            </div>
        </div>
    );
}
