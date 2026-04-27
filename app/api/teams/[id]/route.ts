import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { isWorkspaceAdmin } from "@/lib/workspace";
import { createActivity } from "@/lib/activity";

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

        const { findAcrossShards } = await import("@/lib/prisma");
        const teamResult = await findAcrossShards<any>("team", { id: params.id });

        if (!teamResult.data) {
            return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }

        const db = teamResult.db;
        const team = await db.team.findUnique({
            where: { id: params.id },
        });

        if (!team) {
            return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }

        // Aggregate unique member count from both shards
        const shardUserIds = (await db.teamMember.findMany({ 
            where: { teamId: params.id }, 
            select: { userId: true } 
        })).map(m => m.userId);
        
        const primaryUserIds = (await prisma.teamMember.findMany({ 
            where: { teamId: params.id }, 
            select: { userId: true } 
        })).map(m => m.userId);
        
        const membersCount = new Set([...shardUserIds, ...primaryUserIds]).size;

        return NextResponse.json({
            ...team,
            membersCount,
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

        const { findAcrossShards } = await import("@/lib/prisma");
        const teamResult = await findAcrossShards<any>("team", { id: params.id });

        if (!teamResult.data) {
            return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }

        const db = teamResult.db;
        const team = await db.team.findUnique({
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

        // Check if user is team admin or workspace admin
        const isTeamAdmin = team.members[0]?.role === "admin";
        const isWorkspaceAdm = await isWorkspaceAdmin(user.id, team.workspaceId);

        if (!isTeamAdmin && !isWorkspaceAdm) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const data = updateTeamSchema.parse(body);

        const updatedTeam = await db.team.update({
            where: { id: params.id },
            data,
        });

        // Log activity
        await createActivity(
            user.id,
            team.workspaceId,
            "updated",
            "team",
            team.id,
            { teamName: updatedTeam.name, changes: Object.keys(data) }
        );

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

        const { findAcrossShards } = await import("@/lib/prisma");
        const teamResult = await findAcrossShards<any>("team", { id: params.id });

        if (!teamResult.data) {
            return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }
        
        const db = teamResult.db;
        const team = teamResult.data;

        // Only workspace owners can delete teams?
        const { getWorkspaceMemberRole } = await import("@/lib/workspace");
        const role = await getWorkspaceMemberRole(user.id, team.workspaceId);

        if (role !== "owner" && role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await db.team.delete({
            where: { id: params.id },
        });

        // Log activity
        await createActivity(
            user.id,
            team.workspaceId,
            "deleted",
            "team",
            team.id,
            { teamName: team.name }
        );

        return NextResponse.json({ success: true });
    } catch (error) {
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
