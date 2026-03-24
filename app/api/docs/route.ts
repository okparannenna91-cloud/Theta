import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get("workspaceId");

        if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

        const documents = await prisma.document.findMany({
            where: {
                workspaceId,
                parentId: null,
                archived: false,
            },
            orderBy: { updatedAt: "desc" },
            include: {
                children: {
                    where: { archived: false },
                    select: { id: true, title: true, emoji: true }
                }
            }
        });

        return NextResponse.json(documents);
    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const data = await req.json();
        
        const document = await prisma.document.create({
            data: {
                title: data.title || "Untitled",
                workspaceId: data.workspaceId,
                userId: user.id,
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
