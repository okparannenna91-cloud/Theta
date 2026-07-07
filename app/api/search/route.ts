import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { getAccessibleProjectIds } from "@/lib/project-permissions";
import { logger } from "@/lib/logger";

interface ProjectResult {
  id: string;
  name: string;
  description?: string | null;
  color?: string | null;
  [key: string]: unknown;
}

interface TaskResult {
  id: string;
  title: string;
  description?: string | null;
  project?: { id: string; name: string } | null;
  [key: string]: unknown;
}

function extractId(raw: unknown): string {
  if (!raw) return "";
  if (typeof raw === "string") return raw;
  if (typeof raw === "object") {
    const obj = raw as Record<string, unknown>;
    return String((obj.$oid as string) ?? obj._id ?? obj.id ?? "");
  }
  return String(raw);
}

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

        // Get accessible project IDs for permission filtering
        const accessibleProjectIds = await getAccessibleProjectIds(user.id, workspaceId);

        const searchTerm = query.trim().replace(/[\$\{\}\(\)\[\]]/g, ""); // sanitize: strip MongoDB operators
        const FETCH_LIMIT = 50; // Fetch more to compensate for post-filter removal

        // Search projects using $text if possible, fallback to contains
        let projects: ProjectResult[] = [];
        try {
            const raw = await prisma.$runCommandRaw({
                find: "Project",
                filter: {
                    workspaceId: { $oid: workspaceId },
                    $text: { $search: searchTerm }
                },
                limit: FETCH_LIMIT,
                projection: { name: 1, description: 1, color: 1 }
            });
            const rawList = (raw as any)?.cursor?.firstBatch ?? (raw as any) ?? [];
            projects = (Array.isArray(rawList) ? rawList : []).map((p: any) => ({
                id: extractId(p._id),
                name: p.name || "",
                description: p.description,
                color: p.color,
            })).filter(p => accessibleProjectIds.includes(p.id));
        } catch {
            projects = await prisma.project.findMany({
                where: {
                    workspaceId,
                    id: { in: accessibleProjectIds },
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
        let tasks: TaskResult[] = [];
        try {
            const raw = await prisma.$runCommandRaw({
                find: "Task",
                filter: {
                    workspaceId: { $oid: workspaceId },
                    $text: { $search: searchTerm }
                },
                limit: FETCH_LIMIT,
            });
            const rawList = (raw as any)?.cursor?.firstBatch ?? (raw as any) ?? [];
            const rawTasks = (Array.isArray(rawList) ? rawList : []).map((t: any) => ({
                id: extractId(t._id),
                title: t.title || "",
                description: t.description || "",
                projectId: extractId(t.projectId ?? t.project_id ?? ""),
            }));

            const projectIds = [...new Set(rawTasks.map(t => t.projectId).filter(Boolean))];
            const resolvedProjects = projectIds.length > 0 ? await prisma.project.findMany({
                where: { id: { in: projectIds } },
                select: { id: true, name: true }
            }) : [];

            tasks = rawTasks
                .filter(t => accessibleProjectIds.includes(t.projectId))
                .map(t => ({
                    ...t,
                    project: resolvedProjects.find(p => p.id === t.projectId) || null,
                }));
        } catch {
            tasks = await prisma.task.findMany({
                where: {
                    workspaceId,
                    projectId: { in: accessibleProjectIds },
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
        logger.error("Search error:", error);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
