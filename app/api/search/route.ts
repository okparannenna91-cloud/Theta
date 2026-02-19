import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";

export async function GET(req: Request) {
    try {
        const user = await getCurrentUser();
        if (!user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        let workspaceId = searchParams.get("workspaceId");
        const query = searchParams.get("q");

        if (!workspaceId) {
            const workspace = await prisma.workspaceMember.findFirst({
                where: { userId: user.id },
                orderBy: { createdAt: "asc" },
            });
            workspaceId = workspace?.workspaceId || null;
        }

        if (!workspaceId) {
            return NextResponse.json(
                { error: "workspaceId is required" },
                { status: 400 }
            );
        }

        if (!query || query.trim().length === 0) {
            return NextResponse.json(
                { projects: [], tasks: [], members: [] },
                { status: 200 }
            );
        }

        // Verify workspace access
        const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
        if (!hasAccess) {
            return NextResponse.json(
                { error: "Access denied to workspace" },
                { status: 403 }
            );
        }

        const searchTerm = query.trim();

        // Search projects
        const projects = await prisma.project.findMany({
            where: {
                workspaceId: workspaceId as string,
                OR: [
                    { name: { contains: searchTerm, mode: "insensitive" } },
                    { description: { contains: searchTerm, mode: "insensitive" } },
                ],
            },
            take: 10,
            select: {
                id: true,
                name: true,
                description: true,
                color: true,
            },
        });

        // Search tasks
        const tasks = await prisma.task.findMany({
            where: {
                workspaceId: workspaceId as string,
                OR: [
                    { title: { contains: searchTerm, mode: "insensitive" } },
                    { description: { contains: searchTerm, mode: "insensitive" } },
                ],
            },
            take: 10,
            select: {
                id: true,
                title: true,
                description: true,
                status: true,
                priority: true,
                project: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });

        // Search team members
        const members = await prisma.workspaceMember.findMany({
            where: {
                workspaceId,
                user: {
                    OR: [
                        { name: { contains: searchTerm, mode: "insensitive" } },
                        { email: { contains: searchTerm, mode: "insensitive" } },
                    ],
                },
            },
            take: 10,
            select: {
                user: {
                    select: {
                        id: true,
                        name: true,
                        email: true,
                        imageUrl: true,
                    },
                },
                role: true,
            },
        });

        return NextResponse.json({
            projects,
            tasks,
            members: members.map((m) => ({ ...(m.user || {}), role: m.role })),
        });
    } catch (error) {
        console.error("Search error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
