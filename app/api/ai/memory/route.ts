import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get("workspaceId");

        if (!workspaceId) {
            return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
        }

        const memories = await prisma.aiMemory.findMany({
            where: { userId: user.id },
            orderBy: { updatedAt: "desc" },
        });

        return NextResponse.json(memories);
    } catch (error: any) {
        console.error("AI Memory GET error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { workspaceId, key, content } = await req.json();

        if (!workspaceId || !key || !content) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const memory = await prisma.aiMemory.upsert({
            where: {
                userId_key: {
                    userId: user.id,
                    key: key,
                },
            },
            update: { content, updatedAt: new Date() },
            create: {
                userId: user.id,
                workspaceId,
                key,
                content,
            },
        });

        return NextResponse.json(memory);
    } catch (error: any) {
      console.error("AI Memory POST error:", error);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { workspaceId, key, id } = await req.json();

        if (!workspaceId) {
            return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
        }

        let deleted;

        if (id) {
            deleted = await prisma.aiMemory.delete({
                where: { id },
            });
        } else if (key) {
            deleted = await prisma.aiMemory.delete({
                where: {
                    userId_key: {
                        userId: user.id,
                        key: key,
                    },
                },
            });
        } else {
            return NextResponse.json({ error: "Either id or key is required to delete memory" }, { status: 400 });
        }

        return NextResponse.json({ success: true, message: "Memory deleted successfully", deleted });
    } catch (error: any) {
        console.error("AI Memory DELETE error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
