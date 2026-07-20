import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { getFieldsForBoard, createField } from "@/lib/services/custom-fields";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const createFieldSchema = z.object({
  name: z.string().min(1),
  boardId: z.string().min(1),
  type: z.string().min(1),
  settings: z.record(z.unknown()).optional(),
  order: z.number().optional(),
  width: z.number().optional(),
  color: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const boardId = searchParams.get("boardId");

    if (!boardId) {
      return NextResponse.json(
        { error: "boardId is required" },
        { status: 400 },
      );
    }

    const board = await prisma.board.findUnique({ where: { id: boardId } });
    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const hasAccess = await verifyWorkspaceAccess(user.id, board.workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const fields = await getFieldsForBoard(boardId);
    return NextResponse.json(fields);
  } catch (error) {
    console.error("List custom fields error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const data = createFieldSchema.parse(body);

    const board = await prisma.board.findUnique({ where: { id: data.boardId } });
    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const hasAccess = await verifyWorkspaceAccess(user.id, board.workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const field = await createField({
      name: data.name,
      boardId: data.boardId,
      type: data.type as any,
      settings: data.settings,
      order: data.order,
      width: data.width,
      color: data.color,
    });

    return NextResponse.json(field, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Create custom field error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
