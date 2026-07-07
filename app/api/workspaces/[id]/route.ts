import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getWorkspaceMemberRole, deleteWorkspace } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = params.id;
    const role = await getWorkspaceMemberRole(user.id, workspaceId);
    if (!role) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    const workspace = await prisma.workspace.findUnique({
      where: { id: workspaceId },
    });

    if (!workspace) {
      return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
    }

    return NextResponse.json({
      id: workspace.id,
      name: workspace.name,
      slug: workspace.slug,
      plan: workspace.plan,
      role,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
    });
  } catch (error: any) {
    console.error("Get workspace error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
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

    const { searchParams } = new URL(req.url);
    const forceDelete = searchParams.get("force") === "true";

    const workspaceId = params.id;
    await deleteWorkspace(workspaceId, user.id, forceDelete);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Delete workspace route error:", error);
    return NextResponse.json(
      { error: error.message || "Failed to delete workspace" },
      { status: 500 }
    );
  }
}
