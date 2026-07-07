import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { acceptInvite, getInviteByToken } from "@/lib/invite";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { token } = await req.json();

        if (!token) {
            return NextResponse.json(
                { error: "Token is required" },
                { status: 400 }
            );
        }

        // Check plan limit before accepting (validates billing status and member cap)
        const { valid, invite } = await getInviteByToken(token);
        if (valid && invite) {
            const { enforcePlanLimit } = await import("@/lib/plan-limits");
            // Check if user is already a member to avoid overcounting
            const existingMember = await prisma.workspaceMember.findUnique({
                where: {
                    workspaceId_userId: {
                        workspaceId: invite.workspaceId,
                        userId: user.id,
                    },
                },
            });
            if (!existingMember) {
                const memberCount = await prisma.workspaceMember.count({
                    where: { workspaceId: invite.workspaceId }
                });
                await enforcePlanLimit(invite.workspaceId, "members", memberCount + 1);
            }
        }

        const result = await acceptInvite(token, user.id);

        return NextResponse.json({
            message: "Invite accepted successfully",
            workspace: result.workspace,
        });
    } catch (error: any) {
        console.error("Accept invite error:", error);
        return NextResponse.json(
            { error: error.message || "Failed to accept invite" },
            { status: 400 }
        );
    }
}
