import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { getField, updateField, deleteField } from "@/lib/services/custom-fields";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateFieldSchema = z.object({
  name: z.string().min(1).optional(),
  settings: z.record(z.unknown()).optional(),
  order: z.number().optional(),
  width: z.number().optional(),
  color: z.string().optional(),
  visible: z.boolean().optional(),
  pinned: z.boolean().optional(),
});

async function requireFieldAccess(fieldId: string, userId: string) {
  const field = await getField(fieldId);
  if (!field) return { error: NextResponse.json({ error: "Field not found" }, { status: 404 }) };

  const board = await prisma.board.findUnique({ where: { id: field.boardId } });
  if (!board) return { error: NextResponse.json({ error: "Board not found" }, { status: 404 }) };

  const hasAccess = await verifyWorkspaceAccess(userId, board.workspaceId);
  if (!hasAccess) return { error: NextResponse.json({ error: "Access denied" }, { status: 403 }) };

  return { field };
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await requireFieldAccess(params.id, user.id);
    if ("error" in result) return result.error;

    return NextResponse.json(result.field);
  } catch (error) {
    console.error("Get custom field error:", error);
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

    const result = await requireFieldAccess(params.id, user.id);
    if ("error" in result) return result.error;

    const body = await req.json();
    const data = updateFieldSchema.parse(body);

    const updated = await updateField(params.id, data);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Update custom field error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await requireFieldAccess(params.id, user.id);
    if ("error" in result) return result.error;

    await deleteField(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete custom field error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
