import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
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

        const teamId = params.id;

        const team = await prisma.team.findUnique({ where: { id: teamId } });
        
        if (!team) {
            return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }

        const { verifyWorkspaceAccess } = await import("@/lib/workspace");
        const hasAccess = await verifyWorkspaceAccess(user.id, team.workspaceId);
        if (!hasAccess) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        const membersRaw = await prisma.teamMember.findMany({
            where: { teamId },
            orderBy: { role: "asc" },
        });

        const isValidObjectId = (id: string) => /^[a-fA-F0-9]{24}$/.test(id);
        const uniqueUserIds = [...new Set(membersRaw.map((m: any) => m.userId))].filter(isValidObjectId);

        console.log(`[Team Members] Fetching user profiles for ${uniqueUserIds.length} users...`);

        const users = await prisma.user.findMany({
            where: { id: { in: uniqueUserIds } },
            select: { id: true, name: true, email: true, imageUrl: true }
        });

        const userMap = new Map(users.map(u => [u.id, u]));
        const members = membersRaw.map((m: any) => {
            const userProfile = userMap.get(m.userId);
            return {
                ...m,
                user: userProfile || {
                    id: m.userId,
                    name: "Unknown Member",
                    email: "",
                    imageUrl: null
                }
            };
        });

        return NextResponse.json(members);
    } catch (error) {
        console.error("Fetch team members error:", error);
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
        const userIdToRemove = searchParams.get("userId");

        if (!userIdToRemove) {
            return NextResponse.json({ error: "User ID required" }, { status: 400 });
        }

        const team = await prisma.team.findUnique({
            where: { id: params.id },
            include: { members: true }
        });

        if (!team) {
            return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }

        const currentUserMember = team.members.find(m => m.userId === user.id);
        const { isWorkspaceAdmin } = await import("@/lib/workspace");
        const isWsAdmin = await isWorkspaceAdmin(user.id, team.workspaceId);

        const isTeamAdmin = currentUserMember?.role === "admin";
        const isSelf = user.id === userIdToRemove;

        if (!isWsAdmin && !isTeamAdmin && !isSelf) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        await prisma.teamMember.delete({
            where: {
                teamId_userId: {
                    teamId: params.id,
                    userId: userIdToRemove,
                },
            },
        });

        return NextResponse.json({ success: true });
    } catch (error) {
        console.error("Remove team member error:", error);
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

        const body = await req.json();
        const { userId, role } = body;

        if (!userId || !role) {
            return NextResponse.json({ error: "User ID and role required" }, { status: 400 });
        }

        const team = await prisma.team.findUnique({
            where: { id: params.id },
            include: { members: true }
        });

        if (!team) {
            return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }

        const currentUserMember = team.members.find(m => m.userId === user.id);
        const { isWorkspaceAdmin } = await import("@/lib/workspace");
        const isWsAdmin = await isWorkspaceAdmin(user.id, team.workspaceId);

        if (!isWsAdmin && currentUserMember?.role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const member = await prisma.teamMember.update({
            where: {
                teamId_userId: {
                    teamId: params.id,
                    userId: userId,
                },
            },
            data: { role },
        });

        return NextResponse.json(member);
    } catch (error) {
        console.error("Update team member error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
