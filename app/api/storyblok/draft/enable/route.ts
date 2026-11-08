import { NextResponse } from "next/server";
import { draftMode } from "next/headers";
import {
  STORYBLOK_DRAFT_COOKIE,
  validateStoryblokPreviewToken,
  hasStoryblokEditorParams,
  isPreviewConfigured,
} from "@/lib/storyblok";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = url.searchParams;
  const redirectTo = params.get("redirect") || params.get("path") || "/";

  // Only allow relative redirects on the same site.
  const safeRedirect =
    redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/";

  if (!isPreviewConfigured()) {
    return NextResponse.json({ error: "Preview not configured" }, { status: 503 });
  }

  // Validate access: require Storyblok editor token params.
  const valid =
    validateStoryblokPreviewToken(params) ||
    // Allow explicit secret handshake only if a matching secret is configured AND passed server-side? No - don't accept secrets in URLs.
    false;

  if (!valid && hasStoryblokEditorParams(params)) {
    // Editor opened but token validation failed (e.g. clock skew, wrong space) — deny draft.
    return NextResponse.json({ error: "Invalid preview token" }, { status: 401 });
  }
  if (!valid) {
    return NextResponse.json({ error: "Preview access validation required" }, { status: 401 });
  }

  try {
    const dm = await draftMode();
    dm.enable();
  } catch {
    // ignore; cookie fallback below
  }

  const res = NextResponse.redirect(new URL(safeRedirect, url.origin));
  // Cookie fallback for environments where draftMode cookie handling is constrained.
  // sameSite=none + secure required for iframe (Visual Editor) in modern browsers.
  res.cookies.set(STORYBLOK_DRAFT_COOKIE, "1", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    path: "/",
    maxAge: 60 * 60, // 1 hour
  });
  return res;
}
