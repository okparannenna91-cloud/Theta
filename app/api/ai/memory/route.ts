import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get("workspaceId");

        if (!workspaceId) {
            return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
        }

        const db = getPrismaClient(workspaceId);

        const memories = await db.aiMemory.findMany({
            where: { userId: user.id },
            orderBy: { updatedAt: "desc" },
        });

        return NextResponse.json(memories);
    } catch (error: any) {
        console.error("AI Memory GET error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { workspaceId, key, content } = await req.json();

        if (!workspaceId || !key || !content) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const db = getPrismaClient(workspaceId);

        const memory = await db.aiMemory.upsert({
            where: {
                userId_key: {
                    userId: user.id,
                    key: key,
                },
            },
            update: { content, updatedAt: new Date() },
            create: {
                userId: user.id,
                workspaceId,
                key,
                content,
            },
        });

        return NextResponse.json(memory);
    } catch (error: any) {
        console.error("AI Memory POST error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
