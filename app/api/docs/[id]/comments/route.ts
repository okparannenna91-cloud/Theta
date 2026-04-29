import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { userId } = auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const comments = await prisma.comment.findMany({
            where: { documentId: params.id },
            include: { user: true },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json(comments);
    } catch (error) {
        console.error("[DOC_COMMENTS_GET]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const { userId } = auth();
        if (!userId) return new NextResponse("Unauthorized", { status: 401 });

        const user = await prisma.user.findUnique({ where: { clerkId: userId } });
        if (!user) return new NextResponse("User not found", { status: 404 });

        const { content } = await req.json();

        const comment = await prisma.comment.create({
            data: {
                content,
                documentId: params.id,
                userId: user.id
            },
            include: { user: true }
        });

        return NextResponse.json(comment);
    } catch (error) {
        console.error("[DOC_COMMENTS_POST]", error);
        return new NextResponse("Internal Error", { status: 500 });
    }
}
