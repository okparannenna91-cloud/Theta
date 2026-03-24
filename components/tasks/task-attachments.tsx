"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Image as ImageIcon, Film, Music, Archive, File, Trash2, Download, ExternalLink, Paperclip } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FileUpload } from "@/components/common/file-upload";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

interface Attachment {
    url: string;
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

    const updateTaskMutation = useMutation({
        mutationFn: async (updatedAttachments: Attachment[]) => {
            const res = await fetch(`/api/tasks/${taskId}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ attachments: updatedAttachments }),
            });
            if (!res.ok) throw new Error("Failed to update attachments");
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["board"] });
            queryClient.invalidateQueries({ queryKey: ["tasks"] });
            toast.success("Attachments updated");
        },
    });

    const handleUploadComplete = (data: any) => {
        const newAttachment: Attachment = {
            url: data.url,
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

    const handleDelete = (publicId: string) => {
        const updated = attachments.filter((a) => a.publicId !== publicId);
        updateTaskMutation.mutate(updated);
    };

    const getIcon = (category: string) => {
        switch (category) {
            case "image": return <ImageIcon className="h-4 w-4 text-emerald-500" />;
            case "video": return <Film className="h-4 w-4 text-indigo-500" />;
            case "audio": return <Music className="h-4 w-4 text-pink-500" />;
            case "document": return <FileText className="h-4 w-4 text-blue-500" />;
            case "archive": return <Archive className="h-4 w-4 text-amber-500" />;
            default: return <File className="h-4 w-4 text-slate-500" />;
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
                            <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg group-hover:bg-indigo-50 dark:group-hover:bg-indigo-900/20 transition-colors">
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
                                </div>
                            </div>
                        </div>

                        <div className="flex items-center gap-1 mt-3 pt-3 border-t border-slate-50 dark:border-slate-800 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-indigo-600"
                                onClick={() => window.open(attachment.url, "_blank")}
                            >
                                <ExternalLink className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="h-7 w-7 text-muted-foreground hover:text-red-600 ml-auto"
                                onClick={() => handleDelete(attachment.publicId)}
                            >
                                <Trash2 className="h-3.5 w-3.5" />
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
        </div>
    );
}
