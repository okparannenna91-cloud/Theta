import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    console.log(`[API] Fetching document: ${params.id}`);
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { findAcrossShards } = await import("@/lib/prisma");
        const { data: document, db } = await findAcrossShards<any>("document", {
            id: params.id
        });

        if (!document) {
            console.warn(`[API] Document not found across any shards: ${params.id}`);
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        console.log(`[API] Document found on shard, fetching relations: ${params.id} (Workspace: ${document.workspaceId})`);

        // Fetch children and backlinks using the discovered db shard
        const [docWithRelations, backlinks] = await Promise.all([
            db.document.findUnique({
                where: { id: params.id },
                include: {
                    user: { select: { name: true, imageUrl: true } },
                    parent: { select: { id: true, title: true } },
                    children: {
                        where: { archived: false },
                        select: { id: true, title: true, emoji: true }
                    }
                }
            }),
            db.document.findMany({
                where: {
                    workspaceId: document.workspaceId,
                    content: { contains: params.id },
                    id: { not: params.id },
                    archived: false
                },
                select: { id: true, title: true, emoji: true, updatedAt: true },
                orderBy: { updatedAt: 'desc' }
            })
        ]);

        if (!docWithRelations) {
            console.error(`[API] Document vanished from shard after discovery: ${params.id}`);
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        return NextResponse.json({ ...docWithRelations, backlinks });
    } catch (error: any) {
        console.error(`[API] Error fetching document ${params.id}:`, error);
        return NextResponse.json({ error: "Internal Error", details: error.message }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const data = await req.json();
        
        const { findAcrossShards } = await import("@/lib/prisma");
        const { db } = await findAcrossShards<any>("document", { id: params.id });
        
        const updateData: any = {};
        if (data.title !== undefined) updateData.title = data.title;
        if (data.content !== undefined) updateData.content = data.content;
        if (data.emoji !== undefined) updateData.emoji = data.emoji;
        if (data.coverImage !== undefined) updateData.coverImage = data.coverImage;
        if (data.archived !== undefined) updateData.archived = data.archived;
        if (data.isPublic !== undefined) updateData.isPublic = data.isPublic;
        if (data.isPinned !== undefined) updateData.isPinned = data.isPinned;
        if (data.parentId !== undefined) updateData.parentId = data.parentId;

        const document = await (db.document as any).update({
            where: { id: params.id },
            data: updateData
        });

        return NextResponse.json(document);
    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function DELETE(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { findAcrossShards } = await import("@/lib/prisma");
        const { db } = await findAcrossShards<any>("document", { id: params.id });

        // Archive rather than hard delete for better UX
        await db.document.update({
            where: { id: params.id },
            data: { archived: true }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
