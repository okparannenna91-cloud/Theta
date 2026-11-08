import { NextResponse } from "next/server";
import { draftMode } from "next/headers";
import { STORYBLOK_DRAFT_COOKIE } from "@/lib/storyblok";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const redirectTo = url.searchParams.get("redirect") || "/";
  const safeRedirect =
    redirectTo.startsWith("/") && !redirectTo.startsWith("//") ? redirectTo : "/";
  try {
    const dm = await draftMode();
    dm.disable();
  } catch {}
  const res = NextResponse.redirect(new URL(safeRedirect, url.origin));
  res.cookies.set(STORYBLOK_DRAFT_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
