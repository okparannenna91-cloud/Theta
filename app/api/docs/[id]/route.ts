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

        const document = await prisma.document.findUnique({
            where: { id: params.id },
            include: {
                children: {
                    where: { archived: false },
                    select: { id: true, title: true, emoji: true }
                }
            }
        });

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
        
        const document = await prisma.document.update({
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

        // Archive rather than hard delete for better UX
        await prisma.document.update({
            where: { id: params.id },
            data: { archived: true }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
