import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isWorkspaceAdmin } from "@/lib/workspace";
import { createInvite } from "@/lib/invite";
import { canAddMember, getPlanLimitMessage } from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const inviteSchema = z.object({
    workspaceId: z.string(),
    email: z.string().email(),
    role: z.enum(["owner", "admin", "member"]).default("member"),
    teamId: z.string().optional(),
});

export async function POST(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const data = inviteSchema.parse(body);

        // Verify user is admin/owner of workspace
        const isAdmin = await isWorkspaceAdmin(user.id, data.workspaceId);
        if (!isAdmin) {
            return NextResponse.json(
                { error: "Only workspace admins can create invites" },
                { status: 403 }
            );
        }



        // Check plan limits strictly (including pending invites)
        const workspace = await prisma.workspace.findUnique({
            where: { id: data.workspaceId },
            include: { _count: { select: { members: true } } }
        });

        if (!workspace) return NextResponse.json({ error: "Workspace not found" }, { status: 404 });

        const pendingInviteCount = await prisma.invite.count({
            where: { workspaceId: data.workspaceId, status: "pending" }
        });

        try {
            const { enforcePlanLimit } = await import("@/lib/plan-limits");
            await enforcePlanLimit(data.workspaceId, "members", workspace._count.members + pendingInviteCount);
        } catch (error: any) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        const invite = await createInvite(
            data.workspaceId,
            data.email,
            data.role,
            7,
            data.teamId
        );

        // Fetch workspace name for the email
        const emailWorkspace = await prisma.workspace.findUnique({
            where: { id: data.workspaceId },
            select: { name: true }
        });

        // Generate invite link
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        const inviteLink = `${baseUrl}/invites/${invite.token}`;

        // Send email
        const { sendInviteEmail } = await import("@/lib/email");
        try {
            await sendInviteEmail({
                to: data.email,
                workspaceName: emailWorkspace?.name || "Theta Workspace",
                inviteLink,
                role: data.role,
            });
        } catch (emailError) {
            console.error("Failed to send invite email:", emailError);
            // We still return the invite so it can be copied manually if email fails
        }

        return NextResponse.json({
            ...invite,
            inviteLink,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        console.error("Create invite error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        let workspaceId = searchParams.get("workspaceId");
        const teamId = searchParams.get("teamId");

        const defaultMembership = await prisma.workspaceMember.findFirst({
            where: { userId: user.id },
            orderBy: { createdAt: "asc" },
        });
        workspaceId = defaultMembership?.workspaceId || null;

        if (!workspaceId) {
            return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
        }

        // Verify workspace access
        const membership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId,
                    userId: user.id,
                },
            },
        });

        if (!membership) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const invites = await prisma.invite.findMany({
            where: {
                workspaceId,
                teamId: teamId || undefined
            },
            orderBy: { createdAt: "desc" }
        });

        return NextResponse.json(invites);
    } catch (error) {
        console.error("Fetch invites error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function DELETE(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const inviteId = searchParams.get("id");

        if (!inviteId) {
            return NextResponse.json({ error: "Invite ID is required" }, { status: 400 });
        }

        const invite = await prisma.invite.findUnique({
            where: { id: inviteId }
        });

        if (!invite) {
            return NextResponse.json({ error: "Invite not found" }, { status: 404 });
        }

        // Verify user is admin of workspace
        const isAdmin = await isWorkspaceAdmin(user.id, invite.workspaceId);
        if (!isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await prisma.invite.update({
            where: { id: inviteId },
            data: { status: "revoked" }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Revoke invite error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
