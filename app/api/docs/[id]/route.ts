import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    console.log(`[API] Processing request for Document ID: ${params.id}`);
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { findAcrossShards } = await import("@/lib/prisma");
        
        // Use findAcrossShards to discover which database contains this document
        const { data: document, db } = await findAcrossShards<any>("document", {
            id: params.id
        });

        if (!document) {
            console.error(`[API] Discovery failed. Document ${params.id} not found on any shard.`);
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        console.log(`[API] Document ${params.id} discovered on shard. Fetching full graph...`);

        // Fetch children and backlinks using the discovered db shard
        // Using findFirst instead of findUnique for maximum compatibility with MongoDB _id mappings
        const [docWithRelations, backlinks] = await Promise.all([
            db.document.findFirst({
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
            console.error(`[API] Fatal: Document ${params.id} was visible in search but disappeared during graph fetch.`);
            return NextResponse.json({ error: "Not found" }, { status: 404 });
        }

        console.log(`[API] Document ${params.id} loaded successfully with ${docWithRelations.children.length} children and ${backlinks.length} backlinks.`);
        return NextResponse.json({ ...docWithRelations, backlinks });
    } catch (error: any) {
        console.error(`[API] Critical error fetching document ${params.id}:`, error);
        return NextResponse.json({ 
            error: "Internal Error", 
            message: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
        }, { status: 500 });
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
