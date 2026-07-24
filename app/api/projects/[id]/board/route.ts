import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { requireProjectAccess } from "@/lib/project-permissions";

export async function GET(
  req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const project = await prisma.project.findUnique({
      where: { id: params.id },
      select: { id: true, workspaceId: true },
    });

    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const access = await requireProjectAccess(user.id, project.id, project.workspaceId);
    if (!access.allowed) {
      return NextResponse.json(
        { error: access.error!.message },
        { status: access.error!.status }
      );
    }

    // Find or create the default board for this project
    let board = await prisma.board.findFirst({
      where: { projectId: params.id },
      orderBy: { createdAt: "asc" },
    });

    if (!board) {
      const defaultColumns = ["Todo", "In Progress", "Done"];
      board = await prisma.board.create({
        data: {
          name: project.id,
          projectId: params.id,
          workspaceId: project.workspaceId,
          description: "",
        },
      });

      for (let i = 0; i < defaultColumns.length; i++) {
        const existingStatus = await prisma.status.findFirst({
          where: {
            projectId: params.id,
            name: { equals: defaultColumns[i], mode: "insensitive" },
          },
        });

        const status = existingStatus || await prisma.status.create({
          data: {
            name: defaultColumns[i],
            order: i,
            projectId: params.id,
            workspaceId: project.workspaceId,
          },
        });

        await prisma.column.create({
          data: {
            name: defaultColumns[i],
            boardId: board.id,
            order: i,
          },
        });
      }
    }

    return NextResponse.json(board);
  } catch (error) {
    console.error("Get project board error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
