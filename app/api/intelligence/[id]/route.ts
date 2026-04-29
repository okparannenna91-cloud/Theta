import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { findAcrossShards } from "@/lib/prisma";

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: document, db } = await findAcrossShards<any>("document", {
            id: params.id
        });

        if (!document) return NextResponse.json({ error: "Not found" }, { status: 404 });

        // Update views count
        await db.document.update({
            where: { id: params.id },
            data: { views: { increment: 1 } }
        });

        // Fetch children, user, parent and backlinks
        const [fullDoc, backlinks] = await Promise.all([
            db.document.findUnique({
                where: { id: params.id },
                include: {
                    user: { select: { name: true, imageUrl: true } },
                    parent: { select: { id: true, title: true } },
                    children: {
                        where: { archived: false },
                        select: { id: true, title: true, emoji: true, status: true }
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

        return NextResponse.json({ ...fullDoc, backlinks });
    } catch (error) {
        console.error("[INTELLIGENCE_ID_GET]", error);
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

        if (!db) return NextResponse.json({ error: "Document not found" }, { status: 404 });

        const updateData: any = {
            ...data,
            lastEditedById: user.id
        };

        // Remove ID from data if present to avoid Prisma error
        delete updateData.id;

        const document = await (db.document as any).update({
            where: { id: params.id },
            data: updateData
        });

        return NextResponse.json(document);
    } catch (error) {
        console.error("[INTELLIGENCE_ID_PATCH]", error);
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

        if (!db) return NextResponse.json({ error: "Document not found" }, { status: 404 });

        // Archive rather than delete
        await db.document.update({
            where: { id: params.id },
            data: { archived: true, status: "ARCHIVED" }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("[INTELLIGENCE_ID_DELETE]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
