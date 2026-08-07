import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { prisma } from "@/lib/prisma";
import { GitHubIntegration } from "@/lib/integrations/github";
import { AsanaService } from "@/lib/services/asanaService";
import { TrelloService } from "@/lib/services/trelloService";
import {
  CONTAINER_TYPES,
  persistSyncedItems,
  syncLinkedChildren,
  normalizeGithubIssue,
  normalizeAsanaTask,
  normalizeTrelloCard,
} from "@/lib/services/sync";
import { enforcePlanLimit } from "@/lib/plan-limits";
import { getProjectCount } from "@/lib/usage-tracking";
import { createActivity } from "@/lib/activity";

async function createLinkedProject(
  workspaceId: string,
  userId: string,
  name: string,
  columns?: string[],
) {
  const columnNames = columns?.length ? columns : ["Todo", "In Progress", "Done"];

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

  const board = await prisma.board.create({
    data: {
      name: project.name,
      projectId: project.id,
      workspaceId: project.workspaceId,
      description: "",
    },
  });

  for (let i = 0; i < columnNames.length; i++) {
    const existingStatus = await prisma.status.findFirst({
      where: { projectId: project.id, name: { equals: columnNames[i], mode: "insensitive" } },
    });
    const status =
      existingStatus ||
      (await prisma.status.create({
        data: {
          name: columnNames[i],
          order: i,
          projectId: project.id,
          workspaceId: project.workspaceId,
        },
      }));

    await prisma.column.create({
      data: {
        name: columnNames[i],
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

async function fetchChildren(provider: string, item: any): Promise<any[]> {
  switch (provider) {
    case "github": {
      const github = new GitHubIntegration(item.workspaceId);
      const issues = await github.listIssues("all");
      return issues
        .filter((i: any) => i.repository?.full_name === item.title)
        .map(normalizeGithubIssue);
    }
    case "asana": {
      const asana = new AsanaService(item.workspaceId);
      const tasks = await asana.getTasks(item.externalId);
      return tasks.map((t: any) => normalizeAsanaTask(t, item.externalId));
    }
    case "trello": {
      const trello = new TrelloService(item.workspaceId);
      const cards = await trello.getCards(item.externalId);
      return cards.map((c: any) => normalizeTrelloCard(c, item.externalId));
    }
    default:
      return [];
  }
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

    if (!CONTAINER_TYPES.includes(item.type)) {
      return NextResponse.json({ error: "Only containers (repos, boards, projects) can be linked" }, { status: 400 });
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

      // Trello board lists become the new project's columns.
      let columns: string[] | undefined;
      if (item.provider === "trello") {
        const trello = new TrelloService(item.workspaceId);
        const lists = await trello.getLists(item.externalId);
        columns = lists.map((l: any) => l.name).filter(Boolean);
      }

      project = await createLinkedProject(item.workspaceId, user.id, name, columns);
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
    const children = await fetchChildren(item.provider, item);
    if (children.length > 0) {
      await persistSyncedItems(item.workspaceId, item.integrationId, item.provider, children);
      const result = await syncLinkedChildren(item.workspaceId, user.id, item.provider);
      importedCount = result.created;
    }

    return NextResponse.json({
      project: { id: project.id, name: project.name },
      linked: true,
      importedCount,
    });
  } catch (error: any) {
    console.error("Link container error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
