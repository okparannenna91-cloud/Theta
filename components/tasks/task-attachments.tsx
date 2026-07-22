"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Image as ImageIcon, Film, Music, Archive, File, Trash2, Download, ExternalLink, Paperclip, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/common/file-upload";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Attachment {
    url: string;
    secure_url?: string;
    publicId: string;
    originalName: string;
    mimeType: string;
    size: number;
    category: string;
    createdAt: string;
}

interface TaskAttachmentsProps {
    taskId: string;
    workspaceId: string;
    attachments: Attachment[];
}

export function TaskAttachments({ taskId, workspaceId, attachments = [] }: TaskAttachmentsProps) {
    const queryClient = useQueryClient();
    const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
    const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

    const updateTaskMutation = useMutation({
        mutationFn: async (updatedAttachments: Attachment[]) => {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ fieldValues: { attachments: updatedAttachments } }),
            });
            if (!res.ok) throw new Error("Failed to update attachments");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["board"] });
            queryClient.invalidateQueries({ queryKey: ["tasks", workspaceId] });
            toast.success("Attachments updated");
        },
    });

    const handleUploadComplete = (data: any) => {
        const newAttachment: Attachment = {
            url: data.secure_url || data.url,
            publicId: data.publicId,
            originalName: data.originalName,
            mimeType: data.mimeType,
            size: data.size,
            category: data.category,
            createdAt: new Date().toISOString(),
        };

        const updated = [...attachments, newAttachment];
        updateTaskMutation.mutate(updated);
    };

    const handleDelete = async (attachment: Attachment) => {
        setDeleteConfirm(null);

        try {
            await fetch("/api/upload", {
                method: "DELETE",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    publicId: attachment.publicId,
                    workspaceId,
                }),
            });
        } catch (e) {
            // Continue with removal from task even if Cloudinary delete fails
        }

        const updated = attachments.filter((a) => a.publicId !== attachment.publicId);
        updateTaskMutation.mutate(updated);
    };

    const handleDownload = async (attachment: Attachment) => {
        try {
            const res = await fetch(`/api/download?publicId=${attachment.publicId}&workspaceId=${workspaceId}`);
            if (!res.ok) throw new Error("Download failed");
            const blob = await res.blob();
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = attachment.originalName;
            a.click();
            URL.revokeObjectURL(url);
        } catch {
            window.open(attachment.secure_url || attachment.url, "_blank");
        }
    };

    const getIcon = (category: string) => {
        switch (category) {
            case "image": return <ImageIcon className="h-4 w-4 text-emerald-500" aria-label="Image" />;
            case "video": return <Film className="h-4 w-4 text-indigo-500" aria-label="Video" />;
            case "audio": return <Music className="h-4 w-4 text-pink-500" aria-label="Audio" />;
            case "document": return <FileText className="h-4 w-4 text-blue-500" aria-label="Document" />;
            case "archive": return <Archive className="h-4 w-4 text-amber-500" aria-label="Archive" />;
            default: return <File className="h-4 w-4 text-slate-500" aria-label="File" />;
        }
    };

    const formatBytes = (bytes: number) => {
        if (bytes === 0) return "0 Bytes";
        const k = 1024;
        const sizes = ["Bytes", "KB", "MB", "GB"];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Paperclip className="h-5 w-5 text-indigo-500 rotate-45" />
                    <h3 className="text-sm font-semibold tracking-tight">Attachments</h3>
                </div>
                {attachments.length > 0 && (
                    <span className="text-[10px] font-black uppercase text-muted-foreground mr-1 h-5 min-w-5 flex items-center justify-center bg-accent/20 rounded-full px-2">
                        {attachments.length} Total
                    </span>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {attachments.map((attachment) => (
                    <div key={attachment.publicId} className="group relative border border-slate-200 dark:border-slate-800 rounded-xl p-3 bg-white dark:bg-slate-900 shadow-sm hover:shadow-md transition-all hover:border-indigo-500/30">
                        <div className="flex items-start gap-3">
                            <div
                                className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 transition-colors cursor-pointer"
                                onClick={() => attachment.category === "image" && setLightboxUrl(attachment.secure_url || attachment.url)}
                            >
                                {getIcon(attachment.category)}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate pr-6" title={attachment.originalName}>
                                    {attachment.originalName}
                                </p>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="text-[10px] font-medium text-muted-foreground uppercase">{attachment.category}</span>
                                    <span className="text-slate-200 dark:text-slate-800 text-[10px] opacity-30">•</span>
                                    <span className="text-[10px] text-muted-foreground">{formatBytes(attachment.size)}</span>
                                    <span className="text-slate-200 dark:text-slate-800 text-[10px] opacity-30">•</span>
                                    <span className="text-[10px] text-muted-foreground">{formatDistanceToNow(new Date(attachment.createdAt), { addSuffix: true })}</span>
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-50 dark:border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
                            {attachment.category === "image" ? (
                                <button
                                    onClick={() => setLightboxUrl(attachment.secure_url || attachment.url)}
                                    className="inline-flex items-center justify-center h-7 w-7 text-muted-foreground hover:text-indigo-600 rounded-md hover:bg-accent transition-colors"
                                    aria-label="Preview image"
                                >
                                    <ImageIcon className="h-3.5 w-3.5" />
                                </button>
                            ) : null}
                            <button
                                onClick={() => handleDownload(attachment)}
                                className="inline-flex items-center justify-center h-7 w-7 text-muted-foreground hover:text-indigo-600 rounded-md hover:bg-accent transition-colors"
                                aria-label="Download file"
                            >
                                <Download className="h-3.5 w-3.5" />
                            </button>
                            <button
                                onClick={() => window.open(attachment.secure_url || attachment.url, "_blank")}
                                className="inline-flex items-center justify-center h-7 w-7 text-muted-foreground hover:text-indigo-600 rounded-md hover:bg-accent transition-colors"
                                aria-label="Open in new tab"
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                            </button>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-red-600 ml-auto"
                                onClick={() => setDeleteConfirm(attachment.publicId)}
                                disabled={updateTaskMutation.isPending}
                                aria-label="Delete attachment"
                            >
                                {updateTaskMutation.isPending && deleteConfirm === attachment.publicId ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                    <Trash2 className="h-3.5 w-3.5" />
                                )}
                            </Button>
                        </div>
                    </div>
                ))}

                <FileUpload
                    workspaceId={workspaceId}
                    onUploadComplete={handleUploadComplete}
                    className="h-full flex items-center justify-center"
                />
            </div>

            <Dialog open={!!deleteConfirm} onOpenChange={(open) => !open && setDeleteConfirm(null)}>
                <DialogContent onClose={() => setDeleteConfirm(null)}>
                    <DialogHeader>
                        <DialogTitle>Delete Attachment</DialogTitle>
                        <DialogDescription>
                            Are you sure you want to delete this attachment? This action cannot be undone.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                            Cancel
                        </Button>
                        <Button
                            variant="destructive"
                            onClick={() => {
                                const attachment = attachments.find((a) => a.publicId === deleteConfirm);
                                if (attachment) handleDelete(attachment);
                            }}
                            disabled={updateTaskMutation.isPending}
                        >
                            {updateTaskMutation.isPending ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : null}
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            <Dialog open={!!lightboxUrl} onOpenChange={(open) => !open && setLightboxUrl(null)}>
                <DialogContent onClose={() => setLightboxUrl(null)} className="max-w-4xl">
                    <DialogTitle className="sr-only">Image Preview</DialogTitle>
                    <div className="relative w-full flex items-center justify-center">
                        {lightboxUrl && (
                            <img
                                src={lightboxUrl}
                                alt="Preview"
                                className="max-w-full max-h-[80vh] object-contain rounded-lg"
                            />
                        )}
                    </div>
                </DialogContent>
            </Dialog>
        </div>
    );
}
