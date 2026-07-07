import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { isWorkspaceAdmin } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";
import { cacheInvalidate, cacheKey } from "@/lib/cache";
import { z } from "zod";

const updateMemberSchema = z.object({
    userId: z.string(),
    role: z.enum(["owner", "admin", "member"]),
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

        // Verify workspace access
        const membership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: params.id,
                    userId: user.id,
                },
            },
        });

        if (!membership) {
            return NextResponse.json({ error: "Access denied" }, { status: 403 });
        }

        // H2: Filter active members only
        const members = await prisma.workspaceMember.findMany({
            where: {
                workspaceId: params.id,
                status: "active",
            },
            include: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        imageUrl: true,
                    },
                },
            },
        });

        return NextResponse.json(members.map(m => ({
            id: m.userId,
            name: m.user.name,
            email: m.user.email,
            imageUrl: m.user.imageUrl,
            role: m.role,
        })));
    } catch (error) {
        logger.error("Get workspace members error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
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

        // Only workspace admin can update member roles
        const isAdmin = await isWorkspaceAdmin(user.id, params.id);
        if (!isAdmin) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403 });
        }

        const body = await req.json();
        const data = updateMemberSchema.parse(body);

        // Prevent self-demotion from owner
        if (data.userId === user.id && data.role !== "owner") {
            return NextResponse.json(
                { error: "Cannot change your own owner role" },
                { status: 400 }
            );
        }

        // Check target membership exists
        const targetMembership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: params.id,
                    userId: data.userId,
                },
            },
        });

        if (!targetMembership) {
            return NextResponse.json({ error: "Member not found" }, { status: 404 });
        }

        // Update the member role
        const updatedMember = await prisma.workspaceMember.update({
            where: {
                workspaceId_userId: {
                    workspaceId: params.id,
                    userId: data.userId,
                },
            },
            data: { role: data.role },
        });

        // Invalidate cache
        await cacheInvalidate(cacheKey("member", params.id, data.userId));

        return NextResponse.json({ success: true, role: updatedMember.role });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json({ error: error.errors }, { status: 400 });
        }
        logger.error("Update member role error:", error);
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
        const targetUserId = searchParams.get("userId");

        // If no userId provided, treat as "leave workspace"
        const isLeaving = !targetUserId || targetUserId === user.id;
        const memberId = isLeaving ? user.id : targetUserId;

        // Check permissions
        if (!isLeaving) {
            // Removing someone else requires admin
            const isAdmin = await isWorkspaceAdmin(user.id, params.id);
            if (!isAdmin) {
                return NextResponse.json({ error: "Forbidden" }, { status: 403 });
            }
        }

        // Check target membership exists
        const targetMembership = await prisma.workspaceMember.findUnique({
            where: {
                workspaceId_userId: {
                    workspaceId: params.id,
                    userId: memberId,
                },
            },
        });

        if (!targetMembership) {
            return NextResponse.json({ error: "Member not found" }, { status: 404 });
        }

        // Prevent owner from leaving (must transfer ownership first)
        if (targetMembership.role === "owner" && isLeaving) {
            return NextResponse.json(
                { error: "Owner cannot leave workspace. Transfer ownership first." },
                { status: 400 }
            );
        }

        // Remove the member
        await prisma.workspaceMember.delete({
            where: {
                workspaceId_userId: {
                    workspaceId: params.id,
                    userId: memberId,
                },
            },
        });

        // Invalidate cache
        await cacheInvalidate(cacheKey("member", params.id, memberId));

        return NextResponse.json({ success: true });
    } catch (error) {
        logger.error("Remove member error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
