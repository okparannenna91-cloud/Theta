import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { z } from "zod";

const fieldSchema = z.object({
  label: z.string().min(1),
  type: z.enum(["text", "number", "select", "date", "email", "phone"]),
  required: z.boolean().default(false),
  options: z.array(z.string()).optional(),
});

const createFormSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().max(2000).default(""),
  workspaceId: z.string().min(1),
  fields: z.array(fieldSchema).default([]),
  slug: z.string().optional(),
  isPublic: z.boolean().default(false),
});

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

        const raw = await req.json();
        const parsed = createFormSchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });
        }

        const data = parsed.data;

        // Enforce plan limits (blocks deactivated workspaces)
        const { enforcePlanLimit } = await import("@/lib/plan-limits");
        const formCount = await prisma.form.count({ where: { workspaceId: data.workspaceId } });
        await enforcePlanLimit(data.workspaceId, "forms", formCount);

        const form = await prisma.form.create({
            data: {
                title: data.title,
                description: data.description,
                workspaceId: data.workspaceId,
                userId: user.id,
                fields: data.fields,
                slug: data.slug || `${Date.now()}`,
                isPublic: data.isPublic
            }
        });

        return NextResponse.json(form);
    } catch (error) {
        return NextResponse.json({ error: "Internal Error" }, { status: 500 });
    }
}
