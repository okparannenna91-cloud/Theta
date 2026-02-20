"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@clerk/nextjs";

interface Comment {
    id: string;
    content: string;
    createdAt: string;
    user: {
        id: string;
        name: string | null;
        imageUrl: string | null;
    };
}

interface TaskCommentsProps {
    taskId: string;
}

export function TaskComments({ taskId }: TaskCommentsProps) {
    const [content, setContent] = useState("");
    const { user: currentUser } = useUser();
    const queryClient = useQueryClient();

    const { data: comments, isLoading } = useQuery<Comment[]>({
        queryKey: ["comments", taskId],
        queryFn: async () => {
            const res = await fetch(`/api/tasks/${taskId}/comments`);
            if (!res.ok) throw new Error("Failed to fetch comments");
            return res.json();
        },
    });

    const createCommentMutation = useMutation({
        mutationFn: async (content: string) => {
            const res = await fetch(`/api/tasks/${taskId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content }),
            });
            if (!res.ok) throw new Error("Failed to post comment");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
            setContent("");
            toast.success("Comment posted");
        },
    });

    const deleteCommentMutation = useMutation({
        mutationFn: async (id: string) => {
            const res = await fetch(`/api/comments/${id}`, { method: "DELETE" });
            if (!res.ok) throw new Error("Failed to delete comment");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
            toast.success("Comment deleted");
        },
    });

    const handlePostComment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        createCommentMutation.mutate(content);
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center p-4">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-indigo-500" />
                <h3 className="text-sm font-semibold tracking-tight">Discussion</h3>
            </div>

            <div className="space-y-6">
                {comments?.length === 0 ? (
                    <div className="text-center py-4 bg-accent/20 rounded-xl border border-dashed">
                        <p className="text-xs text-muted-foreground">No comments yet. Start the conversation!</p>
                    </div>
                ) : (
                    comments?.map((comment) => (
                        <div key={comment.id} className="flex gap-3 group">
                            <Avatar className="h-8 w-8 ring-2 ring-background">
                                <AvatarImage src={comment.user.imageUrl || ""} />
                                <AvatarFallback>{comment.user.name?.[0] || "U"}</AvatarFallback>
                            </Avatar>
                            <div className="flex-1 space-y-1">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-foreground">
                                            {comment.user.name || "Anonymous User"}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground">
                                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                        </span>
                                    </div>
                                    {currentUser?.id === comment.user.id && (
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-6 w-6 text-muted-foreground hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                            onClick={() => deleteCommentMutation.mutate(comment.id)}
                                        >
                                            <Trash2 className="h-3 w-3" />
                                        </Button>
                                    )}
                                </div>
                                <div className="text-sm bg-accent/40 dark:bg-slate-800/40 p-3 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-800">
                                    {comment.content}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>

            <form onSubmit={handlePostComment} className="flex flex-col gap-3">
                <div className="relative group">
                    <Textarea
                        placeholder="Write a comment..."
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="min-h-[80px] bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-2xl px-4 py-3 text-sm transition-all resize-none shadow-sm"
                        disabled={createCommentMutation.isPending}
                    />
                    <div className="absolute bottom-2 right-2">
                        <Button
                            type="submit"
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-1.5 h-auto shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20"
                            disabled={!content.trim() || createCommentMutation.isPending}
                        >
                            {createCommentMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <>
                                    <Send className="h-3.5 w-3.5 mr-2" />
                                    Post
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
