import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { findAcrossShards } = await import("@/lib/prisma");
        const { data: document, db } = await findAcrossShards<any>("document", {
            id: params.id,
            isPublic: true,
            archived: false
        });

        if (!document) {
            return new NextResponse("Document not found or is private", { status: 404 });
        }

        // Fetch basic info + children + parent
        const doc = await db.document.findUnique({
            where: { id: params.id },
            include: {
                user: { select: { name: true, imageUrl: true } },
                parent: { select: { id: true, title: true } },
                children: {
                    where: { archived: false, isPublic: true },
                    select: { id: true, title: true, emoji: true }
                }
            }
        });

        return NextResponse.json(doc);
    } catch (error) {
        console.error("Public doc error:", error);
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
