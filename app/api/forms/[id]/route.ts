import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { getForm, updateForm, deleteForm } from "@/lib/services/forms-service";
import { prisma } from "@/lib/prisma";
import { z } from "zod";

const updateFormSchema = z.object({
  title: z.string().min(1).optional(),
  description: z.string().optional(),
  fields: z.array(z.any()).optional(),
  isPublic: z.boolean().optional(),
  slug: z.string().optional(),
});

async function requireFormAccess(formId: string, userId: string) {
  const form = await getForm(formId);
  if (!form) return { error: NextResponse.json({ error: "Form not found" }, { status: 404 }) };

  const hasAccess = await verifyWorkspaceAccess(userId, (form as any).workspaceId);
  if (!hasAccess) return { error: NextResponse.json({ error: "Access denied" }, { status: 403 }) };

  return { form };
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

    const result = await requireFormAccess(params.id, user.id);
    if ("error" in result) return result.error;

    return NextResponse.json(result.form);
  } catch (error) {
    console.error("Get form error:", error);
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

    const result = await requireFormAccess(params.id, user.id);
    if ("error" in result) return result.error;

    const body = await req.json();
    const data = updateFormSchema.parse(body);

    const updated = await updateForm(params.id, data);
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Update form error:", error);
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

    const result = await requireFormAccess(params.id, user.id);
    if ("error" in result) return result.error;

    await deleteForm(params.id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete form error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
