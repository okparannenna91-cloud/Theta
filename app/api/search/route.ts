import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPrismaClient, prisma } from "@/lib/prisma";
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
        const db = getPrismaClient(workspaceId);

        // Search projects using $text if possible, fallback to contains
        let projects: any[] = [];
        try {
            // @ts-ignore - findRaw is available on the model
            projects = await db.project.findRaw({
                filter: {
                    workspaceId: { $oid: workspaceId },
                    $text: { $search: searchTerm }
                },
                options: { limit: 10, projection: { name: 1, description: 1, color: 1 } }
            });
            // Map mongo IDs to prisma IDs if necessary, or just use as is
            projects = projects.map(p => ({ ...p, id: p._id?.$oid || p._id }));
        } catch (e) {
            // Fallback if no text index exists
            projects = await db.project.findMany({
                where: {
                    workspaceId: workspaceId as string,
                    OR: [
                        { name: { contains: searchTerm, mode: "insensitive" } },
                        { description: { contains: searchTerm, mode: "insensitive" } },
                    ],
                },
                take: 10,
                select: { id: true, name: true, description: true, color: true },
            });
        }

        // Search tasks using $text if possible
        let tasks: any[] = [];
        try {
            // @ts-ignore
            tasks = await db.task.findRaw({
                filter: {
                    workspaceId: { $oid: workspaceId },
                    $text: { $search: searchTerm }
                },
                options: { limit: 10 }
            });
            tasks = tasks.map(t => ({ ...t, id: t._id?.$oid || t._id }));
            
            // Resolve project names for tasks (standard Prisma)
            const projectIds = [...new Set(tasks.map(t => t.projectId).filter(Boolean).map(p => p?.$oid || p))];
            const resolvedProjects = await db.project.findMany({
                where: { id: { in: projectIds as string[] } },
                select: { id: true, name: true }
            });
            tasks = tasks.map(t => ({
                ...t,
                id: t._id?.$oid || t._id,
                project: resolvedProjects.find(p => p.id === (t.projectId?.$oid || t.projectId)) || null
            }));
        } catch (e) {
            tasks = await db.task.findMany({
                where: {
                    workspaceId: workspaceId as string,
                    OR: [
                        { title: { contains: searchTerm, mode: "insensitive" } },
                        { description: { contains: searchTerm, mode: "insensitive" } },
                    ],
                },
                take: 10,
                include: { project: { select: { id: true, name: true } } },
            });
        }

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
