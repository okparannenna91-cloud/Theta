import { NextResponse } from "next/server";
import cloudinary, { getAssetInfo } from "@/lib/cloudinary";
import { getCurrentUser } from "@/lib/auth";
import { verifyWorkspaceAccess } from "@/lib/workspace";

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const publicId = searchParams.get("publicId");
        const workspaceId = searchParams.get("workspaceId");

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

        const assetInfo = await getAssetInfo(publicId);
        if (!assetInfo) {
            return NextResponse.json({ error: "File not found" }, { status: 404 });
        }

        const secureUrl = assetInfo.secure_url;
        if (!secureUrl) {
            return NextResponse.json({ error: "File URL not available" }, { status: 404 });
        }

        const response = await fetch(secureUrl);
        if (!response.ok) {
            return NextResponse.json({ error: "Failed to fetch file from storage" }, { status: 502 });
        }

        const blob = await response.blob();
        const originalFilename = assetInfo.public_id?.split("/").pop() || "download";
        const extension = assetInfo.format ? `.${assetInfo.format}` : "";
        const filename = `${originalFilename}${extension}`;

        return new NextResponse(blob, {
            status: 200,
            headers: {
                "Content-Type": assetInfo.resource_type === "image"
                    ? `image/${assetInfo.format}`
                    : "application/octet-stream",
                "Content-Disposition": `attachment; filename="${filename}"`,
                "Content-Length": String(blob.size),
            },
        });
    } catch (error) {
        console.error("Download error:", error);
        return NextResponse.json(
            { error: "Failed to download file" },
            { status: 500 }
        );
    }
}
