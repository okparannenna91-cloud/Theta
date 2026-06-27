import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { isWorkspaceAdmin } from "@/lib/workspace";
import { logActivity } from "@/lib/activity";

const updateTeamSchema = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    status: z.enum(["active", "archived"]).optional(),
    defaultRole: z.enum(["admin", "member", "guest"]).optional(),
});

export async function GET(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const team = await prisma.team.findUnique({ where: { id: params.id } });

        if (!team) {
            return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }

        const { verifyWorkspaceAccess } = await import("@/lib/workspace");
        const hasAccess = await verifyWorkspaceAccess(user.id, team.workspaceId);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const members = await prisma.teamMember.findMany({ 
            where: { teamId: params.id }, 
            select: { userId: true, role: true } 
        });

        const userMembership = members.find(m => m.userId === user.id);

        return NextResponse.json({
            ...team,
            membersCount: members.length,
            userRole: userMembership?.role || "member",
        });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}

export async function PATCH(
    req: Request,
    { params }: { params: { id: string } }
) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const team = await prisma.team.findUnique({
            where: { id: params.id },
            include: {
                members: {
                    where: { userId: user.id },
                },
            },
        });

        if (!team) {
            return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }

        const isTeamAdmin = team.members[0]?.role === "admin";
        const isWorkspaceAdm = await isWorkspaceAdmin(user.id, team.workspaceId);

        if (!isTeamAdmin && !isWorkspaceAdm) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const data = updateTeamSchema.parse(body);

        const updatedTeam = await prisma.team.update({
            where: { id: params.id },
            data,
        });

        // Log activity
        await logActivity({
            userId: user.id,
            workspaceId: team.workspaceId,
            action: "updated",
            entityType: "team",
            entityId: team.id,
            metadata: { teamName: updatedTeam.name, changes: Object.keys(data) }
        });

        return NextResponse.json(updatedTeam);
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
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

        const team = await prisma.team.findUnique({ where: { id: params.id } });

        if (!team) {
            return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }

        const { getWorkspaceMemberRole } = await import("@/lib/workspace");
        const wsRole = await getWorkspaceMemberRole(user.id, team.workspaceId);
        
        const teamMembership = await prisma.teamMember.findUnique({
            where: {
                teamId_userId: {
                    teamId: params.id,
                    userId: user.id
                }
            }
        });

        const isWsManager = wsRole === "owner" || wsRole === "admin";
        const isTeamOwner = teamMembership?.role === "owner" || teamMembership?.role === "admin";

        if (!isWsManager && !isTeamOwner) {
            console.error(`[Team DELETE] Forbidden. userId=${user.id}, wsRole=${wsRole}, teamRole=${teamMembership?.role}`);
            return NextResponse.json({ error: "Forbidden: You do not have permission to delete this team." }, { status: 403 });
        }

        console.log(`[Team DELETE] Deleting team ${params.id}...`);
        
        await prisma.teamMember.deleteMany({ where: { teamId: params.id } });
        await prisma.chatMessage.deleteMany({ where: { teamId: params.id } });
        await prisma.project.updateMany({
            where: { teamId: params.id },
            data: { teamId: null }
        });
        await prisma.team.delete({
            where: { id: params.id },
        });

        // Notify via Ably
        const { getWorkspaceChannel, publishToChannel } = await import("@/lib/ably");
        const workspaceChannel = getWorkspaceChannel(team.workspaceId);
        await publishToChannel(workspaceChannel, "team:deleted", { id: params.id });

        // Log activity
        await logActivity({
            userId: user.id,
            workspaceId: team.workspaceId,
            action: "deleted",
            entityType: "team",
            entityId: team.id,
            metadata: { teamName: team.name }
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
