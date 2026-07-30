import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { getAccessibleProjectIds } from "@/lib/project-permissions";

async function countFiltered(where: any, accessibleProjectIds: string[]) {
  const items = await prisma.notification.findMany({
    where,
    select: { id: true, metadata: true },
  });
  return items.filter((n: any) => {
    if (!n.metadata || !n.metadata.projectId) return true;
    return accessibleProjectIds.includes(n.metadata.projectId);
  }).length;
}

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });

    const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
    if (!hasAccess) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const accessibleProjectIds = await getAccessibleProjectIds(user.id, workspaceId);
    const base = { workspaceId, userId: user.id };

    const [all, unread, assigned, mentions, replies, archived] = await Promise.all([
      countFiltered({ ...base, archived: false }, accessibleProjectIds),
      countFiltered({ ...base, read: false, archived: false }, accessibleProjectIds),
      countFiltered({ ...base, type: "task_assigned", archived: false }, accessibleProjectIds),
      countFiltered({ ...base, type: { in: ["mention", "task_mentioned"] }, archived: false }, accessibleProjectIds),
      countFiltered({ ...base, type: { in: ["comment_reply", "comment"] }, archived: false }, accessibleProjectIds),
      countFiltered({ ...base, archived: true }, accessibleProjectIds),
    ]);

    return NextResponse.json({ all, unread, assigned, mentions, replies, archived });
  } catch (error) {
    console.error("Notification counts error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
