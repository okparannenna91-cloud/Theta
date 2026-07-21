import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { getAccessibleProjectIds, requireProjectAccess, canAccessProjectResource } from "@/lib/project-permissions";
import { z } from "zod";

const documentSchema = z.object({
  title: z.string().min(1),
  content: z.string().optional(),
  workspaceId: z.string(),
  projectId: z.string().optional(),
  emoji: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 }
      );
    }

    // Verify workspace access
    const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied to workspace" },
        { status: 403 }
      );
    }

    const accessibleProjectIds = await getAccessibleProjectIds(user.id, workspaceId);
    const projectId = searchParams.get("projectId");

    const where: any = {
      workspaceId,
      archived: false,
      OR: [
        { projectId: null },
        { projectId: { in: accessibleProjectIds } },
      ],
    };

    if (projectId) {
      where.projectId = projectId;
      delete where.OR;
    }

    const documents = await prisma.document.findMany({
      where,
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({ documents });
  } catch (error) {
    console.error("Documents API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = documentSchema.parse(body);

    // Verify workspace access
    const hasAccess = await verifyWorkspaceAccess(user.id, data.workspaceId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Access denied to workspace" },
        { status: 403 }
      );
    }

    if (data.projectId) {
      const projectAccess = await requireProjectAccess(user.id, data.projectId, data.workspaceId);
      if (!projectAccess.allowed) {
        return NextResponse.json({ error: projectAccess.error!.message }, { status: projectAccess.error!.status });
      }
    }

    // Enforce plan limits (blocks deactivated workspaces)
    const { enforcePlanLimit } = await import("@/lib/plan-limits");
    const docCount = await prisma.document.count({ where: { workspaceId: data.workspaceId, archived: false } });
    await enforcePlanLimit(data.workspaceId, "documents", docCount);

    const document = await prisma.document.create({
      data: {
        title: data.title,
        content: data.content || "",
        workspaceId: data.workspaceId,
        projectId: data.projectId || null,
        userId: user.id,
        emoji: data.emoji || "📄",
        status: "PUBLISHED",
        visibility: "INTERNAL",
      },
    });

    // Log activity
    try {
      const { createActivity } = await import("@/lib/activity");
      await createActivity(
        user.id,
        data.workspaceId,
        "created",
        "document",
        document.id,
        {
          documentTitle: document.title,
        }
      );
    } catch (e) {
      console.error("Activity logging failed for document:", e);
    }

    return NextResponse.json(document);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Create document error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const id = searchParams.get("id");
    const workspaceId = searchParams.get("workspaceId");

    if (!id || !workspaceId) {
      return NextResponse.json(
        { error: "Missing id or workspaceId" },
        { status: 400 }
      );
    }

    // Verify workspace access
    const hasWorkspaceAccess = await verifyWorkspaceAccess(user.id, workspaceId);
    if (!hasWorkspaceAccess) {
      return NextResponse.json(
        { error: "Access denied to workspace" },
        { status: 403 }
      );
    }

    // Fetch the document to verify project-level access
    const document = await prisma.document.findUnique({
      where: { id },
      select: { projectId: true, userId: true },
    });

    if (!document) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Verify project-level access if the document belongs to a project
    if (document.projectId) {
      const projectAccess = await canAccessProjectResource(user.id, workspaceId, document.projectId);
      if (!projectAccess) {
        return NextResponse.json(
          { error: "Access denied to this document" },
          { status: 403 }
        );
      }
    }

    await prisma.document.delete({
      where: { id }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete document error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

