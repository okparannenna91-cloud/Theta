import { NextResponse } from "next/server";
import { submitForm, getFormBySlug } from "@/lib/services/forms-service";
import { z } from "zod";

const submitSchema = z.object({
  data: z.record(z.unknown()),
  metadata: z
    .object({
      userAgent: z.string().optional(),
      ipAddress: z.string().optional(),
    })
    .optional(),
});

export async function POST(
  req: Request,
  { params }: { params: { slug: string } },
) {
  try {
    const form = await getFormBySlug(params.slug);
    if (!form) {
      return NextResponse.json({ error: "Form not found" }, { status: 404 });
    }

    const body = await req.json();
    const data = submitSchema.parse(body);

    const result = await submitForm(form.id, {
      formId: form.id,
      data: data.data,
      metadata: data.metadata,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 });
    }
    console.error("Submit public form error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
