import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { canAccessProjectResource } from "@/lib/project-permissions";
import { z } from "zod";

const updateSchema = z.object({
  title: z.string().min(1).optional(),
  content: z.string().optional(),
  emoji: z.string().optional(),
  coverImage: z.string().optional(),
  projectId: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  status: z.string().optional(),
  visibility: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isTemplate: z.boolean().optional(),
  isPinned: z.boolean().optional(),
  archived: z.boolean().optional(),
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

    const doc = await prisma.document.findUnique({
      where: { id: params.id },
      include: {
        user: { select: { id: true, name: true, imageUrl: true } },
        lastEditedBy: { select: { id: true, name: true } },
        _count: { select: { comments: true } },
        children: {
          where: { archived: false },
          select: { id: true, title: true, emoji: true },
          orderBy: { title: "asc" },
        },
        parent: {
          select: { id: true, title: true, emoji: true },
        },
      },
    });

    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const hasAccess = await verifyWorkspaceAccess(user.id, doc.workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (doc.projectId) {
      const projectAccess = await canAccessProjectResource(user.id, doc.workspaceId, doc.projectId);
      if (!projectAccess) {
        return NextResponse.json({ error: "Access denied to this document" }, { status: 403 });
      }
    }

    await prisma.document.update({
      where: { id: params.id },
      data: { views: { increment: 1 } },
    });

    const wordCount = doc.content
      ? doc.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().split(" ").length
      : 0;

    return NextResponse.json({
      ...doc,
      wordCount,
    });
  } catch (error) {
    console.error("Get document error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const existing = await prisma.document.findUnique({
      where: { id: params.id },
    });
    if (!existing) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const hasAccess = await verifyWorkspaceAccess(user.id, existing.workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (existing.projectId) {
      const projectAccess = await canAccessProjectResource(user.id, existing.workspaceId, existing.projectId);
      if (!projectAccess) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    const body = await req.json();
    const data = updateSchema.parse(body);

    const updateData: Record<string, unknown> = { lastEditedById: user.id };
    if (data.title !== undefined) updateData.title = data.title;
    if (data.content !== undefined) updateData.content = data.content;
    if (data.emoji !== undefined) updateData.emoji = data.emoji;
    if (data.coverImage !== undefined) updateData.coverImage = data.coverImage;
    if (data.projectId !== undefined) updateData.projectId = data.projectId;
    if (data.parentId !== undefined) updateData.parentId = data.parentId;
    if (data.status !== undefined) updateData.status = data.status;
    if (data.visibility !== undefined) updateData.visibility = data.visibility;
    if (data.tags !== undefined) updateData.tags = data.tags;
    if (data.isTemplate !== undefined) updateData.isTemplate = data.isTemplate;
    if (data.isPinned !== undefined) updateData.isPinned = data.isPinned;
    if (data.archived !== undefined) updateData.archived = data.archived;

    const doc = await prisma.document.update({
      where: { id: params.id },
      data: updateData,
      include: {
        user: { select: { id: true, name: true, imageUrl: true } },
        lastEditedBy: { select: { id: true, name: true } },
        _count: { select: { comments: true } },
      },
    });

    try {
      const { createActivity } = await import("@/lib/activity");
      await createActivity(
        user.id,
        existing.workspaceId,
        "updated",
        "document",
        doc.id,
        { documentTitle: doc.title }
      );
    } catch (e) {
      console.error("Activity logging failed:", e);
    }

    // Trigger Automations
    try {
      const { processAutomations } = await import("@/lib/automations/engine");
      await processAutomations(existing.workspaceId, "DOCUMENT_UPDATED", {
        userId: user.id,
        documentId: doc.id,
        documentTitle: doc.title,
      });
    } catch (automationError) {
      console.error("Failed to trigger automations on document update:", automationError);
    }

    return NextResponse.json(doc);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Update document error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const doc = await prisma.document.findUnique({
      where: { id: params.id },
    });
    if (!doc) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    const hasAccess = await verifyWorkspaceAccess(user.id, doc.workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (doc.projectId) {
      const projectAccess = await canAccessProjectResource(user.id, doc.workspaceId, doc.projectId);
      if (!projectAccess) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    await prisma.document.update({
      where: { id: params.id },
      data: { archived: true, status: "ARCHIVED" },
    });

    try {
      const { createActivity } = await import("@/lib/activity");
      await createActivity(
        user.id,
        doc.workspaceId,
        "deleted",
        "document",
        doc.id,
        { documentTitle: doc.title }
      );
    } catch (e) {
      console.error("Activity logging failed:", e);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete document error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
