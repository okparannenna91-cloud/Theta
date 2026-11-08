import { NextResponse } from "next/server";
import { isDraftModeEnabled, isPreviewConfigured } from "@/lib/storyblok";

// GET /api/storyblok/preview?slug=...&path=...
// Returns draft content ONLY when a validated draft preview context is active (cookie/draftMode).
// Preview token is never exposed; draft access requires validation via /api/storyblok/draft/enable.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slug = searchParams.get("slug");
  const path = searchParams.get("path");
  const wantDraft = searchParams.get("version") === "draft";

  if (!slug && !path) {
    return NextResponse.json({ error: "Either slug or path parameter is required" }, { status: 400 });
  }

  const version = wantDraft ? "draft" : "published";
  if (version === "draft") {
    if (!isPreviewConfigured()) {
      return NextResponse.json({ error: "Preview not configured" }, { status: 503 });
    }
    const draft = await isDraftModeEnabled();
    if (!draft) {
      return NextResponse.json({ error: "Draft preview access not validated" }, { status: 401 });
    }
  }

  const storyblok = await import("@/lib/storyblok");
  const data = await storyblok.default.fetchStoryblokContent(slug || path || "", { version });
  if (!data) return NextResponse.json({ error: "Storyblok content not found" }, { status: 404 });
  return NextResponse.json({ story: data });
}

// POST /api/storyblok/preview — draft only, requires validated preview context.
export async function POST(request: Request) {
  try {
    if (!isPreviewConfigured()) {
      return NextResponse.json({ error: "Preview not configured" }, { status: 503 });
    }
    const draft = await isDraftModeEnabled();
    if (!draft) {
      return NextResponse.json({ error: "Draft preview access not validated" }, { status: 401 });
    }
    const body = await request.json().catch(() => ({}));
    const { slug, path } = body as any;
    if (!slug && !path) {
      return NextResponse.json({ error: "Either slug or path is required" }, { status: 400 });
    }
    const storyblok = await import("@/lib/storyblok");
    const data = await storyblok.default.fetchStoryblokContent(slug || path, { version: "draft" });
    if (!data) return NextResponse.json({ error: "Storyblok content not found" }, { status: 404 });
    return NextResponse.json({ story: data });
  } catch (error) {
    console.error("Storyblok preview POST error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
