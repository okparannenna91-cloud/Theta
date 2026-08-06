import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import { GitHubIntegration } from "@/lib/integrations/github";
import {
  persistSyncedItems,
  syncGithubTasks,
  normalizeGithubIssue,
} from "@/lib/services/sync";
import { enforcePlanLimit } from "@/lib/plan-limits";
import { getProjectCount } from "@/lib/usage-tracking";
import { createActivity } from "@/lib/activity";

async function createLinkedProject(workspaceId: string, userId: string, name: string) {
  const projectCount = await getProjectCount(workspaceId);
  await enforcePlanLimit(workspaceId, "projects", projectCount);

  const project = await prisma.project.create({
    data: {
      name,
      workspaceId,
      userId,
      members: { create: { userId, role: "manager" } },
    },
  });

  const defaultColumns = ["Todo", "In Progress", "Done"];
  const board = await prisma.board.create({
    data: {
      name: project.name,
      projectId: project.id,
      workspaceId: project.workspaceId,
      description: "",
    },
  });

  for (let i = 0; i < defaultColumns.length; i++) {
    const existingStatus = await prisma.status.findFirst({
      where: { projectId: project.id, name: { equals: defaultColumns[i], mode: "insensitive" } },
    });
    const status =
      existingStatus ||
      (await prisma.status.create({
        data: {
          name: defaultColumns[i],
          order: i,
          projectId: project.id,
          workspaceId: project.workspaceId,
        },
      }));

    await prisma.column.create({
      data: {
        name: defaultColumns[i],
        boardId: board.id,
        order: i,
      },
    });
  }

  await createActivity(userId, workspaceId, "created", "project", project.id, {
    projectName: project.name,
    entityName: project.name,
  });

  return project;
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { itemId, projectId, newProjectName } = body;

    if (!itemId) {
      return NextResponse.json({ error: "Missing itemId" }, { status: 400 });
    }

    const item = await prisma.syncedItem.findUnique({ where: { id: itemId } });
    if (!item) {
      return NextResponse.json({ error: "Synced item not found" }, { status: 404 });
    }

    if (item.type !== "repo") {
      return NextResponse.json({ error: "Only repositories can be linked to projects" }, { status: 400 });
    }

    const hasAccess = await verifyWorkspaceAccess(user.id, item.workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    let project;
    if (projectId) {
      project = await prisma.project.findFirst({
        where: { id: projectId, workspaceId: item.workspaceId },
      });
      if (!project) {
        return NextResponse.json({ error: "Project not found in this workspace" }, { status: 400 });
      }
    } else {
      const name = (newProjectName || item.title).trim();
      if (!name) {
        return NextResponse.json({ error: "Project name is required" }, { status: 400 });
      }
      project = await createLinkedProject(item.workspaceId, user.id, name);
    }

    await prisma.syncedItem.update({
      where: { id: item.id },
      data: {
        extra: {
          ...((item.extra as any) ?? {}),
          linkedProjectId: project.id,
          linkedProjectName: project.name,
        },
      },
    });

    let importedCount = 0;
    if (item.provider === "github") {
      const github = new GitHubIntegration(item.workspaceId);
      const issues = await github.listIssues("all");
      const repoIssues = issues.filter(
        (i: any) => i.repository?.full_name === item.title,
      );
      if (repoIssues.length > 0) {
        const normalized = repoIssues.map(normalizeGithubIssue);
        await persistSyncedItems(item.workspaceId, item.integrationId, "github", normalized);
        const result = await syncGithubTasks(item.workspaceId, user.id);
        importedCount = result.created;
      }
    }

    return NextResponse.json({
      project: { id: project.id, name: project.name },
      linked: true,
      importedCount,
    });
  } catch (error: any) {
    console.error("Link repo error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
