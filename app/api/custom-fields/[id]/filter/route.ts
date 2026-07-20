import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { filterTasksByField, getField } from "@/lib/services/custom-fields";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const field = await getField(params.id);
    if (!field) {
      return NextResponse.json({ error: "Field not found" }, { status: 404 });
    }

    const board = await prisma.board.findUnique({ where: { id: field.boardId } });
    if (!board) {
      return NextResponse.json({ error: "Board not found" }, { status: 404 });
    }

    const hasAccess = await verifyWorkspaceAccess(user.id, board.workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { searchParams } = new URL(req.url);
    const operator = searchParams.get("operator");
    const valueRaw = searchParams.get("value");

    if (!operator) {
      return NextResponse.json(
        { error: "operator is required" },
        { status: 400 },
      );
    }

    let value: unknown = valueRaw;
    if (valueRaw) {
      try {
        value = JSON.parse(valueRaw);
      } catch {
        // Use raw string if not valid JSON
      }
    }

    const taskIds = await filterTasksByField(
      field.boardId,
      params.id,
      operator,
      value,
    );

    return NextResponse.json({ taskIds });
  } catch (error) {
    console.error("Filter tasks by field error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
