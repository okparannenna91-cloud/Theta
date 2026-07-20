import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import {
  getFieldValue,
  setFieldValue,
  bulkUpdateFieldValues,
  getField,
} from "@/lib/services/custom-fields";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const setValueSchema = z.object({
  taskId: z.string().min(1),
  value: z.any(),
});

const bulkUpdateSchema = z.object({
  taskIds: z.array(z.string()).min(1),
  value: z.any(),
});

async function requireFieldValueAccess(
  fieldId: string,
  userId: string,
) {
  const field = await getField(fieldId);
  if (!field)
    return {
      error: NextResponse.json({ error: "Field not found" }, { status: 404 }),
    };

  const board = await prisma.board.findUnique({ where: { id: field.boardId } });
  if (!board)
    return {
      error: NextResponse.json({ error: "Board not found" }, { status: 404 }),
    };

  const hasAccess = await verifyWorkspaceAccess(userId, board.workspaceId);
  if (!hasAccess)
    return {
      error: NextResponse.json({ error: "Access denied" }, { status: 403 }),
    };

  return { field };
}

export async function GET(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await requireFieldValueAccess(params.id, user.id);
    if ("error" in result) return result.error;

    const { searchParams } = new URL(req.url);
    const taskId = searchParams.get("taskId");

    if (!taskId) {
      return NextResponse.json(
        { error: "taskId is required" },
        { status: 400 },
      );
    }

    const value = await getFieldValue(taskId, params.id);
    return NextResponse.json({ fieldId: params.id, taskId, value });
  } catch (error) {
    console.error("Get field value error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await requireFieldValueAccess(params.id, user.id);
    if ("error" in result) return result.error;

    const body = await req.json();
    const data = setValueSchema.parse(body);

    await setFieldValue(data.taskId, params.id, data.value);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Set field value error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await requireFieldValueAccess(params.id, user.id);
    if ("error" in result) return result.error;

    const body = await req.json();
    const data = bulkUpdateSchema.parse(body);

    const updated = await bulkUpdateFieldValues(
      params.id,
      data.taskIds,
      data.value,
    );

    return NextResponse.json({ success: true, updated });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Bulk update field values error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
