import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { getCurrentUser } from "@/lib/auth";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { canAccessProjectResource } from "@/lib/project-permissions";
import { createActivity } from "@/lib/activity";
import { prisma } from "@/lib/prisma";
import { getPlanLimits } from "@/lib/plan-limits";
import { calculateStorageUsed } from "@/lib/usage-tracking";
import { logger } from "@/lib/logger";

// Supported file types
const ALLOWED_MIME_TYPES = {
    // Images
    "image/jpeg": { category: "image", extension: "jpg" },
    "image/png": { category: "image", extension: "png" },
    "image/gif": { category: "image", extension: "gif" },
    "image/webp": { category: "image", extension: "webp" },

    // Videos
    "video/mp4": { category: "video", extension: "mp4" },
    "video/webm": { category: "video", extension: "webm" },
    "video/quicktime": { category: "video", extension: "mov" },

    // Documents
    "application/pdf": { category: "document", extension: "pdf" },
    "application/msword": { category: "document", extension: "doc" },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { category: "document", extension: "docx" },
    "application/vnd.ms-excel": { category: "document", extension: "xls" },
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": { category: "document", extension: "xlsx" },
    "application/vnd.ms-powerpoint": { category: "document", extension: "ppt" },
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": { category: "document", extension: "pptx" },
    "text/plain": { category: "document", extension: "txt" },

    // Archives
    "application/zip": { category: "archive", extension: "zip" },
    "application/x-rar-compressed": { category: "archive", extension: "rar" },

    // Audio
    "audio/mpeg": { category: "audio", extension: "mp3" },
    "audio/wav": { category: "audio", extension: "wav" },
};

// Max file size: Default 5MB if plan not found
const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024;

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const file = formData.get("file") as File;
        const workspaceId = formData.get("workspaceId") as string;
        const projectId = formData.get("projectId") as string | null;

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
        }

        if (file.size === 0) {
            return NextResponse.json({ error: "File is empty. 0-byte files are not allowed." }, { status: 400 });
        }

        // Verify workspace membership
        if (workspaceId) {
            const hasWorkspaceAccess = await verifyWorkspaceAccess(user.id, workspaceId);
            if (!hasWorkspaceAccess) {
                return NextResponse.json({ error: "Access denied to workspace" }, { status: 403 });
            }
        }

        // Verify project-level access if project context is provided
        if (workspaceId && projectId) {
            const hasProjectAccess = await canAccessProjectResource(user.id, workspaceId, projectId);
            if (!hasProjectAccess) {
                return NextResponse.json({ error: "Access denied to this project's files" }, { status: 403 });
            }
        }

        // Validate file type
        const fileType = ALLOWED_MIME_TYPES[file.type as keyof typeof ALLOWED_MIME_TYPES];
        if (!fileType) {
            return NextResponse.json(
                { error: `File type ${file.type} is not supported` },
                { status: 400 }
            );
        }

        // Check planning limits if workspaceId is provided
        let currentMaxFileSize = DEFAULT_MAX_FILE_SIZE;

        if (workspaceId) {
            const workspace = await prisma.workspace.findUnique({
                where: { id: workspaceId },
                select: { plan: true, subscriptionStatus: true }
            });

            if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

            // Strict Billing Check
            if (workspace.subscriptionStatus === "deactivated") {
                return NextResponse.json({
                    error: "Your workspace has been deactivated due to billing issues. Please update your payment method to resume uploads."
                }, { status: 403 });
            }

            const limits = getPlanLimits(workspace.plan as any);
            currentMaxFileSize = limits.maxFileSize * 1024 * 1024;

            // Check total storage limit
            const storageUsed = await calculateStorageUsed(workspaceId);
            if (limits.maxStorage !== -1 && (storageUsed + file.size / (1024 * 1024)) > limits.maxStorage) {
                return NextResponse.json(
                    { error: `Workspace storage limit exceeded. Your plan allows up to ${limits.maxStorage}MB.` },
                    { status: 403 }
                );
            }
        }

        // Validate file size
        if (file.size > currentMaxFileSize) {
            return NextResponse.json(
                { error: `File size exceeds your plan's maximum of ${currentMaxFileSize / 1024 / 1024}MB` },
                { status: 403 }
            );
        }

        const arrayBuffer = await file.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        // Determine resource type for Cloudinary
        let resourceType: "image" | "video" | "raw" = "raw";
        if (fileType.category === "image") resourceType = "image";
        else if (fileType.category === "video") resourceType = "video";

        // Upload to Cloudinary
        const result: any = await new Promise((resolve, reject) => {
            cloudinary.uploader.upload_stream(
                {
                    folder: "theta-uploads",
                    resource_type: resourceType,
                    // Add original filename as public_id with sanitization
                    public_id: `${Date.now()}-${file.name.replace(/\.[^/.]+$/, "").replace(/[/\\:*?"<>|]/g, "_").trim()}`,
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            ).end(buffer);
        });

        // Log activity for storage tracking
        if (workspaceId) {
            await createActivity(
                user.id,
                workspaceId,
                "file_upload",
                "file",
                result.public_id,
                {
                    size: result.bytes,
                    category: fileType.category,
                    url: result.secure_url
                }
            );
        }

        // Return comprehensive metadata
        return NextResponse.json({
            url: result.secure_url,
            publicId: result.public_id,
            format: result.format,
            resourceType: result.resource_type,
            size: result.bytes,
            width: result.width,
            height: result.height,
            category: fileType.category,
            originalName: file.name,
            mimeType: file.type,
        });
    } catch (error) {
        logger.error("Upload error:", error);
        return NextResponse.json(
            { error: "Failed to upload file. Please try again." },
            { status: 500 }
        );
    }
}

export async function DELETE(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { publicId, workspaceId } = await req.json();

        if (!publicId) {
            return NextResponse.json({ error: "publicId is required" }, { status: 400 });
        }

        if (!workspaceId) {
            return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
        }

        const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        let resourceType: "image" | "raw" | "video" = "raw";
        try {
            const info = await cloudinary.api.resource(publicId, { resource_type: "image" });
            resourceType = "image";
        } catch {
            try {
                const info = await cloudinary.api.resource(publicId, { resource_type: "video" });
                resourceType = "video";
            } catch {
                resourceType = "raw";
            }
        }

        const result = await cloudinary.uploader.destroy(publicId, { resource_type: resourceType });

        if (result.result !== "ok") {
            return NextResponse.json(
                { error: `Failed to delete file from Cloudinary: ${result.result}` },
                { status: 500 }
            );
        }

        await createActivity(
            user.id,
            workspaceId,
            "file_deletion",
            "file",
            publicId,
            { publicId, size: result.bytes || 0 }
        );

        return NextResponse.json({ success: true, message: "File deleted successfully" });
    } catch (error) {
        logger.error("Delete error:", error);
        return NextResponse.json(
            { error: "Failed to delete file" },
            { status: 500 }
        );
    }
}
