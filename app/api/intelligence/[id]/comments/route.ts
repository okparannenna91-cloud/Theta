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

        const { db } = await findAcrossShards<any>("document", { id: params.id });
        if (!db) return NextResponse.json({ error: "Node not found" }, { status: 404 });

        const comments = await db.comment.findMany({
            where: { documentId: params.id },
            include: {
                user: { select: { name: true, imageUrl: true } }
            },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json(comments);
    } catch (error) {
        console.error("[INTELLIGENCE_COMMENTS_GET]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { content } = await req.json();
        if (!content) return NextResponse.json({ error: "Content required" }, { status: 400 });

        const { db } = await findAcrossShards<any>("document", { id: params.id });
        if (!db) return NextResponse.json({ error: "Node not found" }, { status: 404 });

        const comment = await db.comment.create({
            data: {
                content,
                userId: user.id,
                documentId: params.id
            }
        });

        return NextResponse.json(comment);
    } catch (error) {
        console.error("[INTELLIGENCE_COMMENTS_POST]", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
