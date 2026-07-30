import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });

    const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
    if (!hasAccess) return NextResponse.json({ error: "Access denied" }, { status: 403 });

    const base = { workspaceId, userId: user.id };

    const [all, unread, assigned, mentions, replies, archived] = await Promise.all([
      prisma.notification.count({ where: { ...base, archived: false } }),
      prisma.notification.count({ where: { ...base, read: false, archived: false } }),
      prisma.notification.count({ where: { ...base, type: "task_assigned", archived: false } }),
      prisma.notification.count({ where: { ...base, type: { in: ["mention", "task_mentioned"] }, archived: false } }),
      prisma.notification.count({ where: { ...base, type: { in: ["comment_reply", "comment"] }, archived: false } }),
      prisma.notification.count({ where: { ...base, archived: true } }),
    ]);

    return NextResponse.json({ all, unread, assigned, mentions, replies, archived });
  } catch (error) {
    console.error("Notification counts error:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
