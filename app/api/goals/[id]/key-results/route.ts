import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth";
import { createKeyResult, updateKeyResult } from "@/lib/services/goals-service";

const createKeyResultSchema = z.object({
  title: z.string().min(1, "title is required"),
  targetValue: z.number().min(0, "targetValue must be non-negative"),
  unit: z.string().optional(),
  taskIds: z.array(z.string()).optional(),
});

const updateKeyResultSchema = z.object({
  keyResultId: z.string().min(1, "keyResultId is required"),
  currentValue: z.number().min(0, "currentValue must be non-negative"),
});

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = createKeyResultSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const keyResult = await createKeyResult({ ...parsed.data, goalId: params.id });

    return NextResponse.json(keyResult, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    console.error("POST /api/goals/[id]/key-results error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const parsed = updateKeyResultSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
    }

    const keyResult = await updateKeyResult(
      parsed.data.keyResultId,
      parsed.data.currentValue
    );

    return NextResponse.json(keyResult);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.flatten() }, { status: 400 });
    }
    console.error("PATCH /api/goals/[id]/key-results error:", error);
    const message =
      error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
