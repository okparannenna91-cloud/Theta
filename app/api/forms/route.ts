import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get("workspaceId");

        if (!workspaceId) return NextResponse.json({ error: "workspaceId required" }, { status: 400 });

        const forms = await prisma.form.findMany({
            where: { workspaceId },
            include: { _count: { select: { responses: true } } },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json(forms);
    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const data = await req.json();
        
        const form = await prisma.form.create({
            data: {
                title: data.title || "Untitled Form",
                description: data.description || "",
                workspaceId: data.workspaceId,
                userId: user.id,
                fields: data.fields || [],
                slug: data.slug || `${Date.now()}`,
                isPublic: data.isPublic || false
            }
        });

        return NextResponse.json(form);
    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
