import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

async function revokeClerkUser(clerkId: string): Promise<void> {
  const clerkSecret = process.env.CLERK_SECRET_KEY;
  if (!clerkSecret) {
    logger.warn("[Account Deletion] CLERK_SECRET_KEY not set — skipping Clerk user revocation");
    return;
  }

  const baseUrl = "https://api.clerk.com/v1";

  // Revoke all active sessions
  try {
    const sessionsRes = await fetch(`${baseUrl}/clients/${clerkId}/sessions`, {
      headers: { Authorization: `Bearer ${clerkSecret}` },
    });
    if (sessionsRes.ok) {
      const sessions = await sessionsRes.json();
      for (const session of sessions) {
        await fetch(`${baseUrl}/sessions/${session.id}/revoke`, {
          method: "POST",
          headers: { Authorization: `Bearer ${clerkSecret}` },
        });
      }
    }
  } catch (error) {
    logger.error("[Account Deletion] Failed to revoke Clerk sessions:", error);
  }

  // Delete the Clerk user
  try {
    const res = await fetch(`${baseUrl}/users/${clerkId}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${clerkSecret}` },
    });
    if (!res.ok) {
      const body = await res.text();
      logger.error(`[Account Deletion] Clerk API delete failed (${res.status}): ${body}`);
    }
  } catch (error) {
    logger.error("[Account Deletion] Failed to delete Clerk user:", error);
  }
}

export async function DELETE() {
    try {
        const user = await getCurrentUser();
        if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Check if user is the sole owner of any workspace before deletion
        const ownedWorkspaces = await prisma.workspaceMember.count({
            where: { userId: user.id, role: { in: ["owner"] } },
        });
        if (ownedWorkspaces > 0) {
            const ownerCounts = await prisma.workspaceMember.groupBy({
                by: ["workspaceId"],
                where: { userId: user.id, role: "owner" },
                _count: true,
            });
            for (const ws of ownerCounts) {
                const totalOwners = await prisma.workspaceMember.count({
                    where: { workspaceId: ws.workspaceId, role: "owner" },
                });
                if (totalOwners <= 1) {
                    return NextResponse.json({
                        error: "Cannot delete account: you are the sole owner of one or more workspaces. Transfer ownership or delete the workspace first."
                    }, { status: 409 });
                }
            }
        }

        // Revoke Clerk user sessions and delete the Clerk user
        await revokeClerkUser(user.clerkId);

        // Delete the local Prisma user record (cascade handles workspace members etc.)
        await prisma.user.delete({
            where: { id: user.id },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error("Account deletion error:", error);
        return NextResponse.json({ error: "Failed to delete account" }, { status: 500 });
    }
}
