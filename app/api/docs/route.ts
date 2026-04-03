import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get("workspaceId");
        const projectId = searchParams.get("projectId");

        if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

        const where: any = {
            workspaceId,
            archived: false,
        };

        if (projectId) {
            where.projectId = projectId;
        }

        const { getPrismaClient } = await import("@/lib/prisma");
        const db = getPrismaClient(workspaceId);

        const documents = await db.document.findMany({
            where,
            orderBy: { updatedAt: "desc" },
            // include children for nesting if needed, but client-side building is better from flat array
        });

        return NextResponse.json(documents);
    } catch (error) {
        console.error("GET docs error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const data = await req.json();
        
        const { getPrismaClient } = await import("@/lib/prisma");
        const db = getPrismaClient(data.workspaceId);
        
        const document = await db.document.create({
            data: {
                title: data.title || "Untitled",
                workspaceId: data.workspaceId,
                userId: user.id,
                projectId: data.projectId || null,
                parentId: data.parentId || null,
                emoji: data.emoji || "📄",
                content: ""
            }
        });

        return NextResponse.json(document);
    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
