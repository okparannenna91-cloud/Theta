import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { publishToChannel, getBoardChannel } from "@/lib/ably";

const reorderSchema = z.object({
  columnOrders: z.array(z.object({
    id: z.string(),
    order: z.number(),
  })),
});

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
    const data = reorderSchema.parse(body);

    const board = await prisma.board.findUnique({ where: { id: params.id } });
    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const membership = await prisma.workspaceMember.findUnique({
      where: {
        workspaceId_userId: {
          workspaceId: board.workspaceId,
          userId: user.id,
        },
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    await prisma.$transaction(
      data.columnOrders.map((col) =>
        prisma.column.updateMany({
          where: { id: col.id, boardId: params.id },
          data: { order: col.order },
        })
      )
    );

    // Also update matching Status records order
    for (const col of data.columnOrders) {
      const column = await prisma.column.findUnique({
        where: { id: col.id },
        select: { name: true },
      });
      if (column) {
        const matchingStatus = await prisma.status.findFirst({
          where: {
            projectId: board.projectId,
            name: { equals: column.name, mode: "insensitive" },
          },
        });
        if (matchingStatus) {
          await prisma.status.update({
            where: { id: matchingStatus.id },
            data: { order: col.order },
          });
        }
      }
    }

    // Verify all columns were found (ownership check)
    const updatedCount = data.columnOrders.length;
    const affectedCount = await prisma.column.count({
      where: { id: { in: data.columnOrders.map(c => c.id) }, boardId: params.id },
    });
    if (affectedCount !== updatedCount) {
      return NextResponse.json({ error: "One or more columns do not belong to this board" }, { status: 403 });
    }

    const boardChannel = getBoardChannel(board.workspaceId, params.id);
    await publishToChannel(boardChannel, "column:reordered", data.columnOrders);

    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Reorder columns error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
