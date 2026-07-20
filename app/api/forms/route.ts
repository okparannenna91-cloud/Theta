import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { getFormsForWorkspace, createForm } from "@/lib/services/forms-service";
import { z } from "zod";

const createFormSchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  workspaceId: z.string().min(1),
  fields: z.array(z.any()).min(1),
  isPublic: z.boolean().optional(),
  slug: z.string().optional(),
});

export async function GET(req: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json(
        { error: "workspaceId is required" },
        { status: 400 },
      );
    }

    const hasAccess = await verifyWorkspaceAccess(user.id, workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const forms = await getFormsForWorkspace(workspaceId);
    return NextResponse.json(forms);
  } catch (error) {
    console.error("List forms error:", error);
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
    const data = createFormSchema.parse(body);

    const hasAccess = await verifyWorkspaceAccess(user.id, data.workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const form = await createForm(
      data.title,
      data.description ?? null,
      data.workspaceId,
      user.id,
      data.fields,
      data.isPublic ?? false,
    );

    return NextResponse.json(form, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Create form error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
