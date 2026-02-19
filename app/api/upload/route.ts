import { NextResponse } from "next/server";
import cloudinary from "@/lib/cloudinary";
import { getCurrentUser } from "@/lib/auth";

// Supported file types
const ALLOWED_MIME_TYPES = {
    // Images
    "image/jpeg": { category: "image", extension: "jpg" },
    "image/png": { category: "image", extension: "png" },
    "image/gif": { category: "image", extension: "gif" },
    "image/webp": { category: "image", extension: "webp" },
    "image/svg+xml": { category: "image", extension: "svg" },

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

        if (!file) {
            return NextResponse.json({ error: "No file provided" }, { status: 400 });
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
            const { prisma } = await import("@/lib/prisma");
            const { getPlanLimits, enforcePlanLimit } = await import("@/lib/plan-limits");
            const { calculateStorageUsed } = await import("@/lib/usage-tracking");

            const workspace = await prisma.workspace.findUnique({
                where: { id: workspaceId },
                select: { plan: true, billingStatus: true }
            });

            if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

            // Strict Billing Check
            if (workspace.billingStatus === "deactivated") {
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
                    // Add original filename as public_id
                    public_id: `${Date.now()}-${file.name.replace(/\.[^/.]+$/, "")}`,
                },
                (error, result) => {
                    if (error) reject(error);
                    else resolve(result);
                }
            ).end(buffer);
        });

        // Log activity for storage tracking
        if (workspaceId) {
            const { createActivity } = await import("@/lib/activity");
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
        console.error("Upload error:", error);
        return NextResponse.json(
            { error: "Failed to upload file. Please try again." },
            { status: 500 }
        );
    }
}
