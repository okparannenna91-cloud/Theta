import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { decrypt } from "@/lib/crypto";
import { refreshGoogleToken } from "@/lib/services/google/oauth";

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

        const integration = await prisma.integration.findFirst({
            where: { workspaceId, provider: "google" },
        });

        if (!integration || !integration.refreshToken) {
            return NextResponse.json({ error: "Google integration not found or no refresh token" }, { status: 404 });
        }

        await refreshGoogleToken(integration.id, decrypt(integration.refreshToken));

        return NextResponse.json({ success: true });
    } catch (error: any) {
        console.error("Google refresh error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
