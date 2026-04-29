"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
    MessageSquare, 
    Send, 
    X, 
    User as UserIcon,
    Trash2,
    Smile
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CommentSheetProps {
    nodeId: string;
    isOpen: boolean;
    onClose: () => void;
}

export function CommentSheet({ nodeId, isOpen, onClose }: CommentSheetProps) {
    const queryClient = useQueryClient();
    const [content, setContent] = useState("");

    const { data: comments, isLoading } = useQuery({
        queryKey: ["intelligence-comments", nodeId],
        queryFn: async () => {
            const res = await fetch(`/api/intelligence/${nodeId}/comments`);
            if (!res.ok) throw new Error("Failed to fetch comments");
            return res.json();
        },
        enabled: isOpen
    });

    const sendMutation = useMutation({
        mutationFn: async (text: string) => {
            const res = await fetch(`/api/intelligence/${nodeId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content: text }),
            });
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["intelligence-comments", nodeId] });
            setContent("");
            toast.success("Intelligence shared");
        }
    });

    if (!isOpen) return null;

    return (
        <div className="fixed inset-y-0 right-0 w-96 bg-white dark:bg-slate-900 border-l shadow-2xl z-50 flex flex-col">
            <div className="h-20 px-8 flex items-center justify-between border-b">
                <div className="flex items-center gap-3">
                    <MessageSquare className="h-5 w-5 text-indigo-500" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest">Neural Discussion</h3>
                </div>
                <Button variant="ghost" size="icon" onClick={onClose} className="rounded-xl">
                    <X className="h-4 w-4" />
                </Button>
            </div>

            <ScrollArea className="flex-1 p-8">
                {isLoading ? (
                    <div className="space-y-4">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="h-24 rounded-3xl bg-slate-100 dark:bg-slate-800 animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-8">
                        {comments?.map((comment: any) => (
                            <div key={comment.id} className="flex gap-4">
                                <div className="h-10 w-10 rounded-2xl bg-slate-100 dark:bg-slate-800 overflow-hidden shrink-0">
                                    {comment.user?.imageUrl ? (
                                        <img src={comment.user.imageUrl} alt={comment.user.name} className="h-full w-full object-cover" />
                                    ) : (
                                        <div className="h-full w-full flex items-center justify-center">
                                            <UserIcon className="h-5 w-5 text-slate-400" />
                                        </div>
                                    )}
                                </div>
                                <div className="flex-1 space-y-2">
                                    <div className="flex items-center justify-between">
                                        <span className="text-[10px] font-black uppercase tracking-tight text-slate-900 dark:text-slate-100">{comment.user?.name}</span>
                                        <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">{formatDistanceToNow(new Date(comment.createdAt))} ago</span>
                                    </div>
                                    <div className="p-4 rounded-3xl rounded-tl-none bg-slate-50 dark:bg-slate-800/50 text-[11px] font-bold text-slate-600 dark:text-slate-400 leading-relaxed uppercase tracking-tight">
                                        {comment.content}
                                    </div>
                                </div>
                            </div>
                        ))}
                        {comments?.length === 0 && (
                            <div className="py-20 text-center space-y-4">
                                <MessageSquare className="h-12 w-12 text-slate-200 dark:text-slate-800 mx-auto" />
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">No neural signals detected.</p>
                            </div>
                        )}
                    </div>
                )}
            </ScrollArea>

            <div className="p-8 border-t bg-slate-50/50 dark:bg-slate-950/50">
                <div className="relative">
                    <Input 
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="Type neural message..."
                        className="h-14 rounded-2xl bg-white dark:bg-slate-900 border-none shadow-sm pl-4 pr-12 text-[10px] font-black uppercase tracking-widest"
                        onKeyDown={(e) => {
                            if (e.key === "Enter" && content.trim()) {
                                sendMutation.mutate(content);
                            }
                        }}
                    />
                    <Button 
                        size="icon" 
                        disabled={!content.trim() || sendMutation.isPending}
                        onClick={() => sendMutation.mutate(content)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 h-10 w-10 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-500/20"
                    >
                        <Send className="h-4 w-4 text-white" />
                    </Button>
                </div>
            </div>
        </div>
    );
}
