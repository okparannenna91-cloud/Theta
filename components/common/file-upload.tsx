"use client";

import { useState, useRef } from "react";
import { Upload, X, FileText, Image as ImageIcon, Film, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { usePopups } from "@/components/popups/popup-manager";
import { useQuery } from "@tanstack/react-query";

interface FileUploadProps {
    value?: string | any[];
    onChange?: (url: string) => void;
    onRemove?: () => void;
    workspaceId?: string;
    onUploadComplete?: (data: any) => void;
    label?: string;
    className?: string;
    accept?: string;
    maxSize?: number;
    category?: string;
}

export function FileUpload({ 
    value, 
    onChange, 
    onRemove, 
    workspaceId, 
    onUploadComplete, 
    label, 
    className,
    accept = "*/*",
    maxSize = 25,
    category = "file"
}: FileUploadProps) {
    const { showUpgradePrompt } = usePopups();
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Fetch workspace limits if ID is provided
    const { data: usageData } = useQuery({
        queryKey: ["workspace-usage", workspaceId],
        queryFn: async () => {
            const res = await fetch(`/api/billing/usage?workspaceId=${workspaceId}`);
            if (!res.ok) return null;
            return res.json();
        },
        enabled: !!workspaceId,
    });

    const storageUsage = usageData?.storage || { current: 0, max: -1 };
    const isStorageFull = storageUsage.max !== -1 && storageUsage.current >= storageUsage.max;

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Proactive Plan Checks
        if (workspaceId && isStorageFull) {
            showUpgradePrompt("storage");
            return;
        }

        const fileSizeMB = file.size / (1024 * 1024);
        if (fileSizeMB > maxSize) {
            // Note: In a real app, we'd check if the plan allows larger files here
            showUpgradePrompt("file_size");
            return;
        }

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        if (workspaceId) formData.append("workspaceId", workspaceId);
        if (category) formData.append("category", category);

        try {
            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Upload failed");
            }

            const data = await res.json();
            
            if (onUploadComplete) onUploadComplete(data);
            if (onChange) onChange(data.url || data.secure_url || data.path); // Handle different response shapes
            
            toast.success("File uploaded successfully");
        } catch (error: any) {
            if (error.message?.toLowerCase().includes("limit") || error.message?.toLowerCase().includes("storage")) {
                showUpgradePrompt("storage");
            } else {
                toast.error(error.message);
            }
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    if (value && typeof value === 'string' && value.length > 0) {
        return (
            <div className={cn("relative w-full h-40 group", className)}>
                {category === 'image' || value.match(/\.(jpg|jpeg|png|gif|webp)$/i) ? (
                   <div className="relative w-full h-full rounded-2xl overflow-hidden border">
                      <Image src={value} alt="Upload" fill className="object-cover" />
                   </div>
                ) : (
                    <div className="flex flex-col items-center justify-center p-4 border-2 border-dashed rounded-2xl h-full bg-slate-50 dark:bg-slate-900/50">
                        <FileText className="h-10 w-10 text-indigo-500 mb-2" />
                        <p className="text-[10px] font-black uppercase text-muted-foreground truncate max-w-full px-4">{value.split('/').pop()}</p>
                    </div>
                )}
                <Button
                    onClick={() => {
                        if (onRemove) onRemove();
                        if (onChange) onChange("");
                    }}
                    variant="destructive"
                    size="icon"
                    className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
                >
                    <X className="h-4 w-4" />
                </Button>
            </div>
        );
    }

    return (
        <div className={cn("relative", className)}>
            <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={isUploading}
                accept={accept}
            />
            <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full h-10 border-dashed border-2 bg-slate-50/50 dark:bg-slate-900/50 hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded-xl transition-all"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading}
            >
                {isUploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin text-indigo-500" />
                ) : (
                    <Upload className="h-4 w-4 mr-2 text-indigo-500" />
                )}
                <span className="text-xs font-bold uppercase tracking-wider">
                    {isUploading ? "Uploading..." : label || "Attach File"}
                </span>
            </Button>
        </div>
    );
}
