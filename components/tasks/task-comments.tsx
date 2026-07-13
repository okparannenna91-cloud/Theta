"use client";

import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { MessageSquare, Send, Trash2, Pencil, Reply } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { useUser } from "@clerk/nextjs";
import { useAbly } from "@/hooks/use-ably";
import { getTaskChannel } from "@/lib/ably";

interface CommentUser {
    id: string;
    name: string | null;
    imageUrl: string | null;
}

interface Comment {
    id: string;
    content: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
    parentId: string | null;
    mentionIds: string[];
    user: CommentUser | null;
    replies?: Comment[];
}

interface WorkspaceMember {
    id: string;
    name: string | null;
    email: string | null;
    imageUrl: string | null;
}

interface TaskCommentsProps {
    taskId: string;
    workspaceId: string;
}

function renderCommentContent(content: string, members: WorkspaceMember[] | undefined) {
    if (!members?.length) return content;
    const parts: (string | JSX.Element)[] = [];
    let remaining = content;
    let keyIdx = 0;

    while (remaining.length > 0) {
        const mentionMatch = remaining.match(/@(\w+(?:\s\w+)?)/);
        if (!mentionMatch) {
            parts.push(remaining);
            break;
        }

        const matchIndex = mentionMatch.index!;
        const mentionName = mentionMatch[1];
        const matchedMember = members.find(
            (m) => m.name?.toLowerCase() === mentionName.toLowerCase()
        );

        if (matchIndex > 0) {
            parts.push(remaining.slice(0, matchIndex));
        }

        if (matchedMember) {
            parts.push(
                <span key={keyIdx++} className="font-semibold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/20 px-1 rounded">
                    @{mentionName}
                </span>
            );
        } else {
            parts.push(`@${mentionName}`);
        }

        remaining = remaining.slice(matchIndex + mentionMatch[0].length);
    }

    return parts;
}

function CommentItem({
    comment,
    members,
    currentUser,
    onReply,
    onEdit,
    onDelete,
    editingId,
    editContent,
    setEditContent,
    updateCommentMutation,
    setEditingId,
}: {
    comment: Comment;
    members: WorkspaceMember[] | undefined;
    currentUser: any;
    onReply: (parentId: string) => void;
    onEdit: (comment: Comment) => void;
    onDelete: (id: string) => void;
    editingId: string | null;
    editContent: string;
    setEditContent: (val: string) => void;
    updateCommentMutation: any;
    setEditingId: (val: string | null) => void;
}) {
    const hasMentions = comment.mentionIds && comment.mentionIds.length > 0;

    return (
        <div className="group">
            <div className="flex gap-3">
                <Avatar className="h-8 w-8 ring-2 ring-background">
                    <AvatarImage src={comment.user?.imageUrl || ""} />
                    <AvatarFallback>{comment.user?.name?.[0] || "U"}</AvatarFallback>
                </Avatar>
                <div className="flex-1 space-y-1">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-foreground">
                                {comment.user?.name || "Anonymous User"}
                            </span>
                            <span className="text-[10px] text-muted-foreground">
                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                                {comment.createdAt !== comment.updatedAt && (
                                    <span className="ml-1 italic">(edited)</span>
                                )}
                            </span>
                            {hasMentions && (
                                <span className="text-[10px] text-indigo-500 font-medium">
                                    {comment.mentionIds.length} mention{comment.mentionIds.length > 1 ? "s" : ""}
                                </span>
                            )}
                        </div>
                        {currentUser?.id === comment.userId && (
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 md:opacity-100 transition-opacity">
                                <button
                                    className="h-6 w-6 text-muted-foreground hover:text-indigo-600 rounded-md hover:bg-accent inline-flex items-center justify-center transition-colors"
                                    onClick={() => onReply(comment.id)}
                                    aria-label="Reply to comment"
                                >
                                    <Reply className="h-3 w-3" />
                                </button>
                                <button
                                    className="h-6 w-6 text-muted-foreground hover:text-indigo-600 rounded-md hover:bg-accent inline-flex items-center justify-center transition-colors"
                                    onClick={() => onEdit(comment)}
                                    aria-label="Edit comment"
                                >
                                    <Pencil className="h-3 w-3" />
                                </button>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 text-muted-foreground hover:text-red-600"
                                    onClick={() => onDelete(comment.id)}
                                    aria-label="Delete comment"
                                >
                                    <Trash2 className="h-3 w-3" />
                                </Button>
                            </div>
                        )}
                    </div>
                    {editingId === comment.id ? (
                        <div className="space-y-2">
                            <Textarea
                                value={editContent}
                                onChange={(e) => setEditContent(e.target.value)}
                                className="min-h-[60px] text-sm"
                            />
                            <div className="flex gap-2 justify-end">
                                <Button size="sm" variant="outline" onClick={() => { setEditingId(null); setEditContent(""); }}>
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={() => updateCommentMutation.mutate({ id: comment.id, content: editContent })}
                                    disabled={!editContent.trim() || updateCommentMutation.isPending}
                                >
                                    {updateCommentMutation.isPending ? (
                                        <div className="h-3 w-3 border-2 border-current border-t-transparent rounded-full animate-spin mr-1" />
                                    ) : null}
                                    Save
                                </Button>
                            </div>
                        </div>
                    ) : (
                        <div className="text-sm bg-accent/40 dark:bg-slate-800/40 p-3 rounded-2xl rounded-tl-none border border-slate-200 dark:border-slate-800">
                            {renderCommentContent(comment.content, members)}
                        </div>
                    )}
                </div>
            </div>

            {comment.replies && comment.replies.length > 0 && (
                <div className="ml-11 mt-2 space-y-3 border-l-2 border-indigo-100 dark:border-indigo-900/30 pl-3">
                    {comment.replies.map((reply) => (
                        <CommentItem
                            key={reply.id}
                            comment={reply}
                            members={members}
                            currentUser={currentUser}
                            onReply={onReply}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            editingId={editingId}
                            editContent={editContent}
                            setEditContent={setEditContent}
                            updateCommentMutation={updateCommentMutation}
                            setEditingId={setEditingId}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}

export function TaskComments({ taskId, workspaceId }: TaskCommentsProps) {
    const [content, setContent] = useState("");
    const { user: currentUser } = useUser();
    const queryClient = useQueryClient();
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editContent, setEditContent] = useState("");
    const [replyingTo, setReplyingTo] = useState<string | null>(null);
    const [replyContent, setReplyContent] = useState("");
    const [mentionIds, setMentionIds] = useState<string[]>([]);

    const taskChannel = getTaskChannel(workspaceId, taskId);

    const onCommentCreated = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
    }, [queryClient, taskId]);

    const onCommentDeleted = useCallback(() => {
        queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
    }, [queryClient, taskId]);

    useAbly(taskChannel, "comment:created", onCommentCreated);
    useAbly(taskChannel, "comment:deleted", onCommentDeleted);

    const { data: comments, isLoading, error: commentsError } = useQuery<Comment[]>({
        queryKey: ["comments", taskId],
        queryFn: async () => {
            const res = await fetch(`/api/tasks/${taskId}/comments`);
            if (!res.ok) throw new Error("Failed to fetch comments");
            return res.json();
        },
    });

    const { data: members } = useQuery({
        queryKey: ["members", workspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/workspaces/${workspaceId}/members`);
            if (!res.ok) throw new Error("Failed to fetch members");
            return res.json();
        },
        enabled: !!workspaceId,
    });

    const [mentionSearch, setMentionSearch] = useState("");
    const [showMentions, setShowMentions] = useState(false);

    const filteredMembers = (members as WorkspaceMember[] | undefined)?.filter((m) =>
        m.name?.toLowerCase().includes(mentionSearch.toLowerCase()) ||
        m.email?.toLowerCase().includes(mentionSearch.toLowerCase())
    ).slice(0, 5);

    const createCommentMutation = useMutation({
        mutationFn: async ({ content, parentId, mentionIds }: { content: string; parentId?: string | null; mentionIds?: string[] }) => {
            const res = await fetch(`/api/tasks/${taskId}/comments`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content, parentId: parentId || null, mentionIds: mentionIds || [] }),
            });
            if (!res.ok) throw new Error("Failed to post comment");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
            setContent("");
            setReplyContent("");
            setReplyingTo(null);
            setMentionIds([]);
            toast.success("Comment posted");
        },
        onError: (error: Error) => {
            toast.error(error.message);
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
            setDeleteConfirm(null);
            toast.success("Comment deleted");
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    const updateCommentMutation = useMutation({
        mutationFn: async ({ id, content }: { id: string; content: string }) => {
            const res = await fetch(`/api/comments/${id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ content }),
            });
            if (!res.ok) throw new Error("Failed to update comment");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["comments", taskId] });
            setEditingId(null);
            setEditContent("");
            toast.success("Comment updated");
        },
        onError: (error: Error) => {
            toast.error(error.message);
        },
    });

    const handlePostComment = (e: React.FormEvent) => {
        e.preventDefault();
        if (!content.trim()) return;
        createCommentMutation.mutate({ content, parentId: null, mentionIds });
    };

    const handlePostReply = () => {
        if (!replyContent.trim() || !replyingTo) return;
        createCommentMutation.mutate({ content: replyContent, parentId: replyingTo, mentionIds });
    };

    const handleDeleteConfirm = () => {
        if (deleteConfirm) {
            deleteCommentMutation.mutate(deleteConfirm);
        }
    };

    const handleMentionSelect = (member: WorkspaceMember) => {
        const parts = content.split(" ");
        parts.pop();
        setContent([...parts, `@${member.name || member.email}`].join(" ") + " ");
        setMentionIds((prev) => [...prev, member.id]);
        setShowMentions(false);
    };

    const rootComments = comments?.filter((c) => !c.parentId) || [];

    if (commentsError) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <h3 className="text-sm font-semibold tracking-tight">Discussion</h3>
                </div>
                <div className="flex flex-col items-center justify-center p-6 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-200 dark:border-red-800">
                    <p className="text-xs font-medium text-red-600 dark:text-red-400">Failed to load comments</p>
                    <p className="text-[10px] text-red-500/70 mt-1">Please try refreshing the page.</p>
                </div>
            </div>
        );
    }

    if (isLoading) {
        return (
            <div className="space-y-6">
                <div className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5 text-primary" />
                    <h3 className="text-sm font-semibold tracking-tight">Discussion</h3>
                </div>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="flex gap-3">
                            <Skeleton className="h-8 w-8 rounded-full" />
                            <div className="flex-1 space-y-2">
                                <Skeleton className="h-3 w-24" />
                                <Skeleton className="h-16 w-full rounded-2xl" />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <h3 className="text-sm font-semibold tracking-tight">Discussion</h3>
            </div>

            <div className="space-y-6">
                {rootComments.length === 0 ? (
                    <div className="text-center py-4 bg-accent/20 rounded-xl border border-dashed">
                        <p className="text-xs text-muted-foreground">No comments yet. Start the conversation!</p>
                    </div>
                ) : (
                    rootComments.map((comment) => (
                        <CommentItem
                            key={comment.id}
                            comment={comment}
                            members={members as WorkspaceMember[] | undefined}
                            currentUser={currentUser}
                            onReply={(parentId) => {
                                setReplyingTo(parentId);
                                setReplyContent("");
                            }}
                            onEdit={(c) => {
                                setEditingId(c.id);
                                setEditContent(c.content);
                            }}
                            onDelete={(id) => setDeleteConfirm(id)}
                            editingId={editingId}
                            editContent={editContent}
                            setEditContent={setEditContent}
                            updateCommentMutation={updateCommentMutation}
                            setEditingId={setEditingId}
                        />
                    ))
                )}
            </div>

            {replyingTo && (
                <div className="ml-11 pl-3 border-l-2 border-indigo-100 dark:border-indigo-900/30 space-y-2">
                    <div className="flex items-center justify-between">
                        <span className="text-[10px] font-semibold text-muted-foreground">Replying to comment</span>
                        <button
                            onClick={() => { setReplyingTo(null); setReplyContent(""); }}
                            className="text-[10px] text-muted-foreground hover:text-foreground transition-colors"
                        >
                            Cancel
                        </button>
                    </div>
                    <div className="relative">
                        <Textarea
                            placeholder="Write a reply..."
                            value={replyContent}
                            onChange={(e) => setReplyContent(e.target.value)}
                            className="min-h-[60px] text-sm"
                            autoFocus
                        />
                        <div className="absolute bottom-2 right-2">
                            <Button
                                size="sm"
                                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-1.5 h-auto shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20"
                                disabled={!replyContent.trim() || createCommentMutation.isPending}
                                onClick={handlePostReply}
                            >
                                {createCommentMutation.isPending ? (
                                    <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Send className="h-3.5 w-3.5 mr-2" />
                                        Reply
                                    </>
                                )}
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <form onSubmit={handlePostComment} className="flex flex-col gap-3">
                <div className="relative group">
                    <Textarea
                        placeholder="Write a comment... (use @ to mention)"
                        value={content}
                        onChange={(e) => {
                            const val = e.target.value;
                            setContent(val);

                            const lastWord = val.split(" ").pop();
                            if (lastWord?.startsWith("@")) {
                                setMentionSearch(lastWord.slice(1));
                                setShowMentions(true);
                            } else {
                                setShowMentions(false);
                            }
                        }}
                        className="min-h-[80px] bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-800 focus:border-primary rounded-2xl px-4 py-3 text-sm transition-all resize-none shadow-sm"
                        disabled={createCommentMutation.isPending}
                    />

                    {showMentions && (filteredMembers?.length ?? 0) > 0 && (
                        <div className="absolute bottom-full left-0 w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl z-50 mb-2 overflow-hidden animate-in fade-in slide-in-from-bottom-2">
                            <div className="p-2 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                                <span className="text-[10px] font-semibold text-slate-400">Mention Team Member</span>
                            </div>
                            {filteredMembers?.map((member) => (
                                <button
                                    key={member.id}
                                    type="button"
                                    className="w-full flex items-center gap-3 px-4 py-2 hover:bg-muted text-left transition-colors"
                                    onClick={() => handleMentionSelect(member)}
                                >
                                    <Avatar className="h-6 w-6">
                                        <AvatarImage src={member.imageUrl || ""} />
                                        <AvatarFallback>{(member.name || "U")[0]}</AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-xs font-bold truncate">{member.name || "Anonymous"}</span>
                                        <span className="text-[10px] text-muted-foreground truncate">{member.email}</span>
                                    </div>
                                </button>
                            ))}
                        </div>
                    )}
                    <div className="absolute bottom-2 right-2">
                        <Button
                            type="submit"
                            size="sm"
                            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-4 py-1.5 h-auto shadow-lg shadow-indigo-200 dark:shadow-indigo-900/20"
                            disabled={!content.trim() || createCommentMutation.isPending}
                        >
                            {createCommentMutation.isPending ? (
                                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
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

            <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
                <DialogContent onClose={() => setDeleteConfirm(null)}>
                    <DialogHeader>
                        <DialogTitle>Delete Comment</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this comment? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={handleDeleteConfirm}
                            disabled={deleteCommentMutation.isPending}
                        >
                            {deleteCommentMutation.isPending ? (
                                <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                            ) : null}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
