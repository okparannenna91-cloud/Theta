import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get("workspaceId");
        const projectId = searchParams.get("projectId");
        const isTemplate = searchParams.get("isTemplate") === "true";

        if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

        const db = getPrismaClient(workspaceId);
        
        const where: any = {
            workspaceId,
            archived: false,
            isTemplate,
        };

        if (projectId) {
            where.projectId = projectId;
        }

        const documents = await db.document.findMany({
            where,
            orderBy: { updatedAt: "desc" },
            include: {
                user: { select: { name: true, imageUrl: true } }
            }
        });

        return NextResponse.json(documents);
    } catch (error) {
        console.error("[INTELLIGENCE_GET]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const data = await req.json();
        
        if (!data.workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

        const db = getPrismaClient(data.workspaceId);
        
        const document = await db.document.create({
            data: {
                title: data.title || "Untitled Intelligence",
                workspaceId: data.workspaceId,
                userId: user.id,
                projectId: data.projectId || null,
                parentId: data.parentId || null,
                emoji: data.emoji || "📄",
                status: data.status || "PUBLISHED",
                visibility: data.visibility || "INTERNAL",
                isTemplate: data.isTemplate || false,
                content: data.content || "[]", // Default to empty block array
            }
        });

        return NextResponse.json(document);
    } catch (error) {
        console.error("[INTELLIGENCE_POST]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
