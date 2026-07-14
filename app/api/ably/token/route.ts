import { NextResponse } from "next/server";
import * as Ably from "ably";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { getAccessibleProjectIds } from "@/lib/project-permissions";

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        if (!process.env.ABLY_API_KEY) {
            return NextResponse.json({ error: "Ably API key not configured" }, { status: 500 });
        }

        const { searchParams } = new URL(req.url);
        const workspaceId = searchParams.get("workspaceId");
        const teamId = searchParams.get("teamId");

        // Build capabilities based on user's access
        const capabilities: Record<string, ("subscribe" | "publish" | "history")[]> = {};

        if (workspaceId) {
            // Verify workspace access
            const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
            if (!hasAccess) {
                return NextResponse.json({ error: "Access denied to workspace" }, { status: 403 });
            }

            // Grant access to the workspace-level channel
            capabilities[`workspace:${workspaceId}`] = ["subscribe", "history"];
            capabilities[`workspace:${workspaceId}:chat`] = ["subscribe", "publish", "history"];
            capabilities[`workspace:${workspaceId}:gantt:*`] = ["subscribe", "publish", "history", "presence"];
            capabilities[`workspace:${workspaceId}:task:*`] = ["subscribe", "history"];

            // Grant access to project-specific channels the user can access
            const accessibleProjectIds = await getAccessibleProjectIds(user.id, workspaceId);
            for (const projectId of accessibleProjectIds) {
                capabilities[`workspace:${workspaceId}:project:${projectId}`] = ["subscribe", "history"];
                capabilities[`workspace:${workspaceId}:project:${projectId}:chat`] = ["subscribe", "publish", "history"];
            }

            const teamMemberships = await prisma.teamMember.findMany({
                where: { userId: user.id },
                select: { teamId: true },
            });
            for (const tm of teamMemberships) {
                capabilities[`team:${tm.teamId}:chat`] = ["subscribe", "publish", "history"];
            }
        } else if (teamId) {
            const teamLookup = await prisma.team.findUnique({ where: { id: teamId }, select: { workspaceId: true } });
            if (teamLookup) {
                const wsId = teamLookup.workspaceId;
                const hasAccess = await verifyWorkspaceAccess(user.id, wsId);
                if (!hasAccess) {
                    return NextResponse.json({ error: "Access denied" }, { status: 403 });
                }
                const teamMember = await prisma.teamMember.findUnique({
                    where: { teamId_userId: { teamId, userId: user.id } }
                });
                if (!teamMember) {
                    return NextResponse.json({ error: "Not a team member" }, { status: 403 });
                }
                capabilities[`team:${teamId}:chat`] = ["subscribe", "publish", "history"];
                capabilities[`workspace:${wsId}`] = ["subscribe", "history"];
                capabilities[`workspace:${wsId}:gantt:*`] = ["subscribe", "publish", "history", "presence"];
                capabilities[`workspace:${wsId}:task:*`] = ["subscribe", "history"];
            } else {
                return NextResponse.json({ error: "Team not found" }, { status: 404 });
            }
        } else {
            const memberships = await prisma.workspaceMember.findMany({
                where: { userId: user.id },
                select: { workspaceId: true },
            });
            for (const m of memberships) {
                capabilities[`workspace:${m.workspaceId}`] = ["subscribe", "history"];
                capabilities[`workspace:${m.workspaceId}:gantt:*`] = ["subscribe", "publish", "history", "presence"];
                capabilities[`workspace:${m.workspaceId}:task:*`] = ["subscribe", "history"];
            }
        }

        const ably = new Ably.Rest({ key: process.env.ABLY_API_KEY });

        // Generate token with capability restrictions
        const tokenRequest = await ably.auth.createTokenRequest({
            clientId: user.clerkId,
            capability: capabilities,
        });

        return NextResponse.json(tokenRequest);
    } catch (error) {
        console.error("Ably token error:", error);
        return NextResponse.json(
            { error: "Failed to generate token" },
            { status: 500 }
        );
    }
}
