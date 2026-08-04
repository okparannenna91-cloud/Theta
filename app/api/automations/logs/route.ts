import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { canAccessProject } from "@/lib/project-permissions";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    const projectId = searchParams.get("projectId");

    if (!workspaceId) {
      return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
    }

    const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    if (projectId) {
      const access = await canAccessProject(user.id, projectId, workspaceId);
      if (!access.hasAccess) {
        return NextResponse.json({ error: "Access denied" }, { status: 403 });
      }
    }

    // AutomationLog has no projectId column; project scoping is carried in
    // metadata.projectId, which the executor writes on every execution.
    const where: Record<string, unknown> = { workspaceId };
    if (projectId) {
      where.metadata = { path: ["projectId"], equals: projectId };
    }

    const logs = await prisma.automationLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 50,
      select: {
        id: true,
        automationId: true,
        trigger: true,
        action: true,
        result: true,
        error: true,
        createdAt: true,
        metadata: true,
      },
    });

    return NextResponse.json({ logs });
  } catch (error) {
    console.error("Automation logs error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
