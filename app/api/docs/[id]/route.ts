import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { findAcrossShards } = await import("@/lib/prisma");
        const { data: document, db } = await findAcrossShards<any>("document", {
            id: params.id
        });

        if (document) {
            // Need to re-fetch with include since findAcrossShards might not support it easily
            const [doc, backlinks] = await Promise.all([
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
                    workspaceId: (await db.document.findUnique({ where: { id: params.id }, select: { workspaceId: true } }))?.workspaceId,
                    content: { contains: params.id },
                    id: { not: params.id },
                    archived: false
                },
                select: { id: true, title: true, emoji: true, updatedAt: true },
                orderBy: { updatedAt: 'desc' }
            })
        ]);

        if (!doc) return new NextResponse("Not Found", { status: 404 });

        return NextResponse.json({ ...doc, backlinks });
        }

        if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

        return NextResponse.json(document);
    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
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
        
        const document = await db.document.update({
            where: { id: params.id },
            data: {
              title: data.title,
              content: data.content,
              emoji: data.emoji,
              coverImage: data.coverImage,
              archived: data.archived,
              isPublic: data.isPublic,
              parentId: data.parentId
            }
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
