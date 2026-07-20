import { NextResponse } from "next/server";
import { getFormBySlug } from "@/lib/services/forms-service";

export async function GET(
  _req: Request,
  { params }: { params: { slug: string } },
) {
  try {
    const form = await getFormBySlug(params.slug);
    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    return NextResponse.json(form);
  } catch (error) {
    console.error("Get public form error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
