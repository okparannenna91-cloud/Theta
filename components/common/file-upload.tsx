"use client";

import { useState, useRef } from "react";
import { Upload, X, FileText, Image as ImageIcon, Film, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface FileUploadProps {
    workspaceId: string;
    onUploadComplete: (data: any) => void;
    label?: string;
    className?: string;
}

export function FileUpload({ workspaceId, onUploadComplete, label, className }: FileUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        formData.append("workspaceId", workspaceId);

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
            onUploadComplete(data);
            toast.success("File uploaded successfully");
        } catch (error: any) {
            toast.error(error.message);
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = "";
        }
    };

    return (
        <div className={cn("relative", className)}>
            <input
                type="file"
                className="hidden"
                ref={fileInputRef}
                onChange={handleFileChange}
                disabled={isUploading}
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
