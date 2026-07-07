import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { revokeGoogleToken } from "@/lib/services/google/oauth";

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { workspaceId } = await req.json();

        if (!workspaceId) {
            return NextResponse.json({ error: "Missing workspaceId" }, { status: 400 });
        }

        // Revoke tokens (best-effort)
        try {
            await revokeGoogleToken(workspaceId);
        } catch {
            // continue with deletion
        }

        // Delete the integration record
        await prisma.integration.deleteMany({
            where: { workspaceId, provider: "google" },
        });

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Google disconnect error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
