import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { verifyWorkspaceAccess } from "@/lib/workspace";
import { duplicateForm, getForm } from "@/lib/services/forms-service";
import { z } from "zod";

const duplicateSchema = z.object({
  newTitle: z.string().optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { id: string } },
) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const form = await getForm(params.id);
    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const hasAccess = await verifyWorkspaceAccess(user.id, (form as any).workspaceId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    let newTitle: string | undefined;
    try {
      const body = await req.json();
      const data = duplicateSchema.parse(body);
      newTitle = data.newTitle;
    } catch {
      // Body can be empty for duplicate
    }

    const duplicated = await duplicateForm(params.id, newTitle);
    return NextResponse.json(duplicated, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Duplicate form error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
