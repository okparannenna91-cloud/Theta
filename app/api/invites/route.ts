import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isWorkspaceAdmin } from "@/lib/workspace";
import { createInvite, resendInvite } from "@/lib/invite";
import { canAddMember, getPlanLimitMessage } from "@/lib/plan-limits";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const inviteSchema = z.object({
    workspaceId: z.string(),
    email: z.string().email().optional(),
    emails: z.array(z.string().email()).optional(),
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
        // Determine workspaceId – required for permission checks and shard routing
        let targetWorkspaceId: string | undefined = body.workspaceId;
        // If missing, attempt to derive from teamId
        if (!targetWorkspaceId && body.teamId) {
            const { findAcrossShards } = await import("@/lib/prisma");
            const teamLookup = await findAcrossShards<any>("team", { id: body.teamId });
            if (teamLookup.data) {
                targetWorkspaceId = teamLookup.data.workspaceId;
                console.log(`[Invite POST] Derived workspaceId=${targetWorkspaceId} from teamId=${body.teamId}`);
            }
        }
        if (!targetWorkspaceId) {
            return NextResponse.json({ error: "workspaceId is required" }, { status: 400 });
        }
        const data = inviteSchema.parse({ ...body, workspaceId: targetWorkspaceId });

        // Verify user is admin/owner of workspace OR admin/owner of the target team
        // Use derived targetWorkspaceId for workspace admin check
        const isWsAdmin = await isWorkspaceAdmin(user.id, targetWorkspaceId);
        
        let isTeamAdmin = false;
        if (data.teamId) {
            const { getPrismaClient } = await import("@/lib/prisma");
            const db = getPrismaClient(targetWorkspaceId);
            const teamMember = await db.teamMember.findUnique({
                where: {
                    teamId_userId: {
                        teamId: data.teamId,
                        userId: user.id
                    }
                }
            });
            isTeamAdmin = teamMember?.role === "admin" || teamMember?.role === "owner";
        }

        if (!isWsAdmin && !isTeamAdmin) {
            console.error(`[Invite POST] Forbidden. userId=${user.id}, isWsAdmin=${isWsAdmin}, isTeamAdmin=${isTeamAdmin}`);
            return NextResponse.json(
                { error: "Access denied: Only workspace admins or team owners can create invites" },
                { status: 403 }
            );
        }



        const emailsToProcess = new Set<string>();
        if (data.email) emailsToProcess.add(data.email);
        if (data.emails) data.emails.forEach(e => emailsToProcess.add(e));
        
        if (emailsToProcess.size === 0) {
            return NextResponse.json({ error: "At least one email is required" }, { status: 400 });
        }

        // Check plan limits strictly (including pending invites)
        const activeMemberCount = await (prisma.workspaceMember as any).count({
            where: { 
                workspaceId: data.workspaceId,
                OR: [
                    { status: "active" },
                    { status: { isSet: false } }
                ]
            }
        });

        const pendingInviteCount = await prisma.invite.count({
            where: { workspaceId: data.workspaceId, status: "pending" }
        });

        try {
            const { enforcePlanLimit } = await import("@/lib/plan-limits");
            await enforcePlanLimit(data.workspaceId, "members", activeMemberCount + pendingInviteCount + emailsToProcess.size - 1); // -1 because limit applies to total after addition
        } catch (error: any) {
            return NextResponse.json({ error: error.message }, { status: 403 });
        }

        // Fetch workspace name for the email
        const emailWorkspace = await prisma.workspace.findUnique({
            where: { id: data.workspaceId },
            select: { name: true }
        });

        const protocol = req.headers.get("x-forwarded-proto") || "https";
        const host = req.headers.get("host");
        let baseUrl = process.env.NEXT_PUBLIC_APP_URL || (host ? `${protocol}://${host}` : "https://thetapm.site");
        if (baseUrl.includes("localhost")) {
            baseUrl = "https://thetapm.site";
        }
        
        const { sendInviteEmail } = await import("@/lib/email");
        
        const createdInvites = [];
        
        for (const targetEmail of Array.from(emailsToProcess)) {
            const invite = await createInvite(
                data.workspaceId,
                targetEmail,
                data.role,
                7,
                data.teamId
            );
            
            const inviteLink = `${baseUrl}/invites/${invite.token}`;
            
            try {
                await sendInviteEmail({
                    to: targetEmail,
                    workspaceName: emailWorkspace?.name || "Theta Workspace",
                    inviteLink,
                    role: data.role,
                });
            } catch (emailError) {
                console.error(`Failed to send invite email to ${targetEmail}:`, emailError);
            }
            
            createdInvites.push({ ...invite, inviteLink });
        }

        // Maintain backward compatibility for single-email calls by returning the first invite as the main object
        return NextResponse.json({
            ...createdInvites[0],
            allInvites: createdInvites
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

export async function PATCH(req: Request) {
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

        const { invite, workspaceName } = await resendInvite(inviteId);

        // Verify user is admin of workspace
        const isAdmin = await isWorkspaceAdmin(user.id, invite.workspaceId);
        if (!isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // Generate invite link
        const protocol = req.headers.get("x-forwarded-proto") || "https";
        const host = req.headers.get("host");
        let baseUrl = process.env.NEXT_PUBLIC_APP_URL || (host ? `${protocol}://${host}` : "https://thetapm.site");
        
        // Final safeguard: If we accidentally get localhost in production, force the correct domain
        if (baseUrl.includes("localhost")) {
            baseUrl = "https://thetapm.site";
        }
        const inviteLink = `${baseUrl}/invites/${invite.token}`;

        // Send email
        const { sendInviteEmail } = await import("@/lib/email");
        await sendInviteEmail({
            to: invite.email,
            workspaceName: workspaceName || "Theta Workspace",
            inviteLink,
            role: invite.role,
        });

        return NextResponse.json({
            ...invite,
            inviteLink,
        });
    } catch (error: any) {
        console.error("Resend invite error:", error);
        return NextResponse.json(
            { error: error.message || "Internal server error" },
            { status: 500 }
        );
    }
}
