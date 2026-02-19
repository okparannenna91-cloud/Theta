"use client";

import { useState } from "react";
import { Upload, X, File, FileText, FileVideo, FileAudio, FileArchive, Loader2, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Image from "next/image";
import { useWorkspace } from "@/hooks/use-workspace";

interface FileUploadProps {
    value?: string;
    onChange: (url: string) => void;
    onRemove: () => void;
    accept?: string; // MIME types to accept
    maxSize?: number; // Max size in MB
    category?: "image" | "video" | "document" | "audio" | "archive" | "any";
}

export function FileUpload({
    value,
    onChange,
    onRemove,
    accept,
    maxSize = 100,
    category = "any",
}: FileUploadProps) {
    const { activeWorkspaceId } = useWorkspace();
    const [isUploading, setIsUploading] = useState(false);
    const [fileInfo, setFileInfo] = useState<any>(null);

    const handleUpload = async (file: File) => {
        try {
            setIsUploading(true);

            // Validate file size
            const maxBytes = maxSize * 1024 * 1024;
            if (file.size > maxBytes) {
                toast.error(`File size must be less than ${maxSize}MB`);
                return;
            }

            const formData = new FormData();
            formData.append("file", file);
            if (activeWorkspaceId) {
                formData.append("workspaceId", activeWorkspaceId);
            }

            const res = await fetch("/api/upload", {
                method: "POST",
                body: formData,
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || "Upload failed");
            }

            const data = await res.json();
            setFileInfo(data);
            onChange(data.url);
            toast.success("File uploaded successfully");
        } catch (error: any) {
            toast.error(error.message || "Failed to upload file");
        } finally {
            setIsUploading(false);
        }
    };

    const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
        e.preventDefault();
        const file = e.dataTransfer.files[0];
        if (file) handleUpload(file);
    };

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) handleUpload(file);
    };

    const getFileIcon = (category: string) => {
        switch (category) {
            case "image":
                return <ImageIcon className="h-8 w-8 text-blue-500" />;
            case "video":
                return <FileVideo className="h-8 w-8 text-purple-500" />;
            case "document":
                return <FileText className="h-8 w-8 text-orange-500" />;
            case "audio":
                return <FileAudio className="h-8 w-8 text-green-500" />;
            case "archive":
                return <FileArchive className="h-8 w-8 text-gray-500" />;
            default:
                return <File className="h-8 w-8 text-gray-500" />;
        }
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + " B";
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
        return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    };

    if (value) {
        return (
            <div className="relative">
                {fileInfo?.category === "image" || (!fileInfo && category === "image") ? (
                    <div className="relative w-full h-48 rounded-lg overflow-hidden border">
                        <Image
                            src={value}
                            alt="Uploaded file"
                            fill
                            className="object-cover"
                        />
                        <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={onRemove}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ) : fileInfo?.category === "video" ? (
                    <div className="relative w-full rounded-lg overflow-hidden border">
                        <video
                            src={value}
                            controls
                            className="w-full max-h-64"
                        />
                        <Button
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2"
                            onClick={onRemove}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                ) : (
                    <div className="flex items-center gap-3 p-4 border rounded-lg">
                        {getFileIcon(fileInfo?.category || "document")}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                                {fileInfo?.originalName || "Uploaded file"}
                            </p>
                            {fileInfo?.size && (
                                <p className="text-xs text-muted-foreground">
                                    {formatFileSize(fileInfo.size)}
                                </p>
                            )}
                        </div>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={onRemove}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <div
            onDrop={handleDrop}
            onDragOver={(e) => e.preventDefault()}
            className="border-2 border-dashed rounded-lg p-8 text-center hover:border-primary transition-colors cursor-pointer"
        >
            <input
                type="file"
                id="file-upload"
                className="hidden"
                accept={accept}
                onChange={handleFileChange}
                disabled={isUploading}
            />
            <label htmlFor="file-upload" className="cursor-pointer">
                {isUploading ? (
                    <div className="flex flex-col items-center gap-2">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="text-sm text-muted-foreground">Uploading...</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2">
                        <Upload className="h-8 w-8 text-muted-foreground" />
                        <div>
                            <p className="text-sm font-medium">
                                Click to upload or drag and drop
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                                Max file size: {maxSize}MB
                            </p>
                        </div>
                    </div>
                )}
            </label>
        </div>
    );
}
