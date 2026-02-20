import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const tagSchema = z.object({
    name: z.string().min(1),
    color: z.string().optional(),
});

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const tags = await prisma.tag.findMany({
            where: { workspaceId: params.id },
            orderBy: { name: "asc" },
        });

        return NextResponse.json(tags);
    } catch (error) {
        console.error("Fetch tags error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function POST(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        // Verify workspace access
        const membership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: params.id,
                    userId: user.id,
                },
            },
        });

        if (!membership) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const body = await req.json();
        const data = tagSchema.parse(body);

        const tag = await prisma.tag.create({
            data: {
                name: data.name,
                color: data.color || "#4f46e5",
                workspaceId: params.id,
            },
        });

        return NextResponse.json(tag);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        if ((error as any).code === "P2002") {
            return NextResponse.json({ error: "Tag name already exists in this workspace" }, { status: 400 });
        }
        console.error("Create tag error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
