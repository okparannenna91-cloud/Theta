import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canAccessProjectResource } from "@/lib/project-permissions";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { z } from "zod";

const createSchema = z.object({
  title: z.string().min(1).max(500),
  order: z.number().optional(),
});

const updateSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  completed: z.boolean().optional(),
  order: z.number().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const task = await prisma.task.findUnique({ where: { id: params.id } });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const hasAccess = await verifyWorkspaceAccess(user.id, task.workspaceId);
    if (!hasAccess) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const hasProjectAccess = await canAccessProjectResource(user.id, task.workspaceId, task.projectId);
    if (!hasProjectAccess) return NextResponse.json({ error: "Access denied to this project" }, { status: 403 });

    const items = await prisma.checklistItem.findMany({
      where: { taskId: params.id },
      orderBy: { order: "asc" },
    });

    return NextResponse.json(items);
  } catch (error) {
    console.error("Fetch checklist error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const task = await prisma.task.findUnique({ where: { id: params.id } });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: task.workspaceId, userId: user.id } },
    });
    if (!membership) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const hasProjectAccess = await canAccessProjectResource(user.id, task.workspaceId, task.projectId);
    if (!hasProjectAccess) return NextResponse.json({ error: "Access denied to this project" }, { status: 403 });

    const body = await req.json();
    const data = createSchema.parse(body);

    const maxOrder = await prisma.checklistItem.aggregate({
      where: { taskId: params.id },
      _max: { order: true },
    });

    const item = await prisma.checklistItem.create({
      data: {
        title: data.title,
        taskId: params.id,
        order: data.order ?? ((maxOrder._max.order ?? -1) + 1),
      },
    });

    return NextResponse.json(item);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Create checklist item error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();

    if (Array.isArray(body.items)) {
      const task = await prisma.task.findUnique({ where: { id: params.id } });
      if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

      const membership = await prisma.workspaceMember.findUnique({
        where: { workspaceId_userId: { workspaceId: task.workspaceId, userId: user.id } },
      });
      if (!membership) return NextResponse.json({ error: "Access denied" }, { status: 403 });

      const updates = body.items.map((item: { id: string; title?: string; completed?: boolean; order?: number }) =>
        prisma.checklistItem.update({
          where: { id: item.id },
          data: {
            ...(item.title !== undefined && { title: item.title }),
            ...(item.completed !== undefined && { completed: item.completed }),
            ...(item.order !== undefined && { order: item.order }),
          },
        })
      );

      const results = await prisma.$transaction(updates);
      return NextResponse.json(results);
    }

    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  } catch (error) {
    console.error("Update checklist error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const itemId = searchParams.get("itemId");
    if (!itemId) return NextResponse.json({ error: "itemId is required" }, { status: 400 });

    const item = await prisma.checklistItem.findUnique({ where: { id: itemId } });
    if (!item || item.taskId !== params.id) return NextResponse.json({ error: "Item not found" }, { status: 404 });

    const task = await prisma.task.findUnique({ where: { id: params.id } });
    if (!task) return NextResponse.json({ error: "Task not found" }, { status: 404 });

    const membership = await prisma.workspaceMember.findUnique({
      where: { workspaceId_userId: { workspaceId: task.workspaceId, userId: user.id } },
    });
    if (!membership) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    await prisma.checklistItem.delete({ where: { id: itemId } });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete checklist item error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
