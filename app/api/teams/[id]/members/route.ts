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

        const { findAcrossShards } = await import("@/lib/prisma");
        const teamResult = await findAcrossShards<any>("team", { id: teamId });
        
        if (!teamResult.data) {
            return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }
        
        const db = teamResult.db;

        // Fetch from shard
        const membersRawShard = await db.teamMember.findMany({
            where: { teamId },
            orderBy: { role: "asc" },
        });

        // Fetch from primary shard (legacy)
        const membersRawPrimary = await prisma.teamMember.findMany({
            where: { teamId },
            orderBy: { role: "asc" },
        });

        // Merge and deduplicate by userId
        // Favoring shard-specific data over primary legacy data
        const membersMap = new Map();

        // 1. Load primary (legacy) members
        for (const m of membersRawPrimary) {
            membersMap.set(m.userId, m);
        }

        // 2. Overwrite/Add with shard-specific members (Authoritative)
        for (const m of membersRawShard) {
            membersMap.set(m.userId, m);
        }

        const membersRaw = Array.from(membersMap.values());

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

        const { findAcrossShards } = await import("@/lib/prisma");
        const teamResult = await findAcrossShards<any>("team", { id: params.id });
        if (!teamResult.data) {
            return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }
        
        const db = teamResult.db;
        const team = await db.team.findUnique({
            where: { id: params.id },
            include: { members: true }
        });

        if (!team) {
            return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }

        // Check permissions
        const currentUserMember = team.members.find(m => m.userId === user.id);
        const { isWorkspaceAdmin } = await import("@/lib/workspace");
        const isWsAdmin = await isWorkspaceAdmin(user.id, team.workspaceId);

        // Allow if workspace admin, active team admin, or leaving self
        const isTeamAdmin = currentUserMember?.role === "admin";
        const isSelf = user.id === userIdToRemove;

        if (!isWsAdmin && !isTeamAdmin && !isSelf) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // 1. Delete from shard (Authoritative)
        await db.teamMember.delete({
            where: {
                teamId_userId: {
                    teamId: params.id,
                    userId: userIdToRemove,
                },
            },
        });

        // 2. Delete from primary (Legacy/Sync)
        try {
            await prisma.teamMember.delete({
                where: {
                    teamId_userId: {
                        teamId: params.id,
                        userId: userIdToRemove,
                    },
                },
            });
        } catch (e) {
            // Ignore if already deleted from primary
            console.log(`[Team Members DELETE] Primary record already gone or missing: ${userIdToRemove}`);
        }

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

        const { findAcrossShards } = await import("@/lib/prisma");
        const teamResult = await findAcrossShards<any>("team", { id: params.id });
        if (!teamResult.data) {
            return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }
        
        const db = teamResult.db;
        const team = await db.team.findUnique({
            where: { id: params.id },
            include: { members: true }
        });

        if (!team) {
            return NextResponse.json({ error: "Team not found" }, { status: 404 });
        }

        // Check permissions
        const currentUserMember = team.members.find(m => m.userId === user.id);
        const { isWorkspaceAdmin } = await import("@/lib/workspace");
        const isWsAdmin = await isWorkspaceAdmin(user.id, team.workspaceId);

        if (!isWsAdmin && currentUserMember?.role !== "admin") {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        // 1. Update shard (Authoritative)
        const member = await db.teamMember.update({
            where: {
                teamId_userId: {
                    teamId: params.id,
                    userId: userId,
                },
            },
            data: { role },
        });

        // 2. Update primary (Legacy/Sync)
        try {
            await prisma.teamMember.update({
                where: {
                    teamId_userId: {
                        teamId: params.id,
                        userId: userId,
                    },
                },
                data: { role },
            });
        } catch (e) {
            console.log(`[Team Members PATCH] Primary record missing for role update: ${userId}`);
        }

        return NextResponse.json(member);
    } catch (error) {
        console.error("Update team member error:", error);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}
