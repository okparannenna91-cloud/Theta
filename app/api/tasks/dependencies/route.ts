import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getPrismaClient } from "@/lib/prisma";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { z } from "zod";
import { publishToChannel, getWorkspaceChannel } from "@/lib/ably";

const dependencySchema = z.object({
  taskId: z.string(),
  predecessorId: z.string(),
  workspaceId: z.string(),
  type: z.enum(["FS", "SS", "FF", "SF"]).default("FS"),
  lag: z.number().default(0),
});

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = dependencySchema.parse(body);

    const hasAccess = await verifyWorkspaceAccess(user.id, data.workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const db = getPrismaClient(data.workspaceId);

    // Prevent circular dependencies (basic check)
    if (data.taskId === data.predecessorId) {
        return NextResponse.json({ error: "Cannot create self-dependency" }, { status: 400 });
    }

    const dependency = await db.taskDependency.create({
      data: {
        taskId: data.taskId,
        predecessorId: data.predecessorId,
        type: data.type,
        lag: data.lag,
      },
      include: {
        task: true,
        predecessor: true,
      }
    });

    // Notify workspace
    const workspaceChannel = getWorkspaceChannel(data.workspaceId);
    await publishToChannel(workspaceChannel, "task:dependency:created", dependency);

    // Log Activity
    const { createActivity } = await import("@/lib/activity");
    await createActivity(
      user.id,
      data.workspaceId,
      "linked",
      "task",
      data.taskId,
      {
        predecessorId: data.predecessorId,
        type: data.type,
      }
    );

    return NextResponse.json(dependency);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Create dependency error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");
    const taskId = searchParams.get("taskId");
    const predecessorId = searchParams.get("predecessorId");

    if (!workspaceId || !taskId || !predecessorId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const db = getPrismaClient(workspaceId);

    await db.taskDependency.delete({
      where: {
        taskId_predecessorId: {
          taskId,
          predecessorId,
        }
      }
    });

    // Notify workspace
    const workspaceChannel = getWorkspaceChannel(workspaceId);
    await publishToChannel(workspaceChannel, "task:dependency:deleted", { taskId, predecessorId });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete dependency error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
