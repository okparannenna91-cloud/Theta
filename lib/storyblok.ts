/**
 * Storyblok CMS Integration - server-side first, secure by default.
 *
 * - Public token (STORYBLOK_TOKEN): used for published content. Safe to use in
 *   server fetches; do not expose preview capabilities client-side.
 * - Preview token (STORYBLOK_PREVIEW_TOKEN): SERVER-SIDE ONLY for draft content.
 *   Never expose via NEXT_PUBLIC_* or send to the browser.
 * - EU region: STORYBLOK_API_REGION=eu -> https://api.storyblok.com/v2 with
 *   region-aware base (Storyblok CDN supports eu via api.storyblok.com; we also
 *   respect the configured region for clarity).
 */

import crypto from "crypto";
import { cookies, draftMode } from "next/headers";

export const STORYBLOK_DRAFT_COOKIE = "__storyblok_draft";

const SPACE_ID = process.env.STORYBLOK_SPACE_ID || "";
const PUBLIC_TOKEN = process.env.STORYBLOK_TOKEN || "";
const PREVIEW_TOKEN = process.env.STORYBLOK_PREVIEW_TOKEN || "";
const API_REGION = (process.env.STORYBLOK_API_REGION || "us").toLowerCase();

const API_BASE =
  API_REGION === "eu"
    ? "https://api.storyblok.com/v2"
    : "https://api.storyblok.com/v2";

export type StoryblokVersion = "draft" | "published";

export interface StoryblokStory {
  id?: number;
  uuid?: string;
  name?: string;
  slug?: string;
  full_slug?: string;
  content?: Record<string, any>;
  published_at?: string | null;
  first_published_at?: string | null;
  created_at?: string;
  updated_at?: string;
  [key: string]: any;
}

export interface StoryblokPageResult {
  story: StoryblokStory;
  rels?: any[];
  links?: any[];
}

function getToken(version: StoryblokVersion): string {
  return version === "draft" ? PREVIEW_TOKEN : PUBLIC_TOKEN;
}

function versionParam(version: StoryblokVersion): "draft" | "published" {
  return version === "draft" ? "draft" : "published";
}

async function sbFetch<T>(path: string, params: Record<string, string>): Promise<T | null> {
  const token = params.token;
  if (!token) return null;
  const url = new URL(`${API_BASE}${path}`);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  // Cache-bust drafts; allow caching for published content via Next fetch.
  const init: RequestInit =
    params.version === "draft"
      ? { cache: "no-store", headers: { "Content-Type": "application/json" } }
      : { next: { revalidate: 300 }, headers: { "Content-Type": "application/json" } };

  const res = await fetch(url.toString(), init);
  if (res.status === 404) return null;
  if (!res.ok) {
    console.error(`[storyblok] ${res.status} ${path}`);
    return null;
  }
  return (await res.json()) as T;
}

export async function fetchStoryblokContent(
  slugOrPath: string,
  options: { version?: StoryblokVersion } = {}
): Promise<StoryblokStory | null> {
  const version = options.version || "published";
  const token = getToken(version);
  if (!token) return null;

  const clean = slugOrPath.replace(/^\/+|\/+$/g, "");
  // Try by slug first, then by full path.
  const bySlug = await sbFetch<{ story: StoryblokStory }>(`/cdn/stories/${clean}`, {
    token,
    version: versionParam(version),
  });
  if (bySlug?.story) return bySlug.story;

  // Fallback: find by full_slug
  const list = await sbFetch<{ stories: StoryblokStory[] }>(`/cdn/stories`, {
    token,
    version: versionParam(version),
    "filter_query[full_slug][in]": clean,
    per_page: "1",
  });
  return list?.stories?.[0] || null;
}

export async function fetchStoryblokEntries(
  slugs: string[],
  options: { version?: StoryblokVersion } = {}
): Promise<Map<string, StoryblokStory | null>> {
  const out = new Map<string, StoryblokStory | null>();
  await Promise.all(
    slugs.map(async (s) => out.set(s, await fetchStoryblokContent(s, options)))
  );
  return out;
}

export async function getStoryblokPage(
  path: string,
  options: { version?: StoryblokVersion; preview?: boolean } = {}
): Promise<StoryblokPageResult | null> {
  const preview = !!options.preview;
  const version: StoryblokVersion = preview ? "draft" : options.version || "published";
  if (preview && !PREVIEW_TOKEN) return null;
  const token = getToken(version);
  if (!token) return null;

  const clean = path.replace(/^\/+|\/+$/g, "") || "home";
  const data = await sbFetch<{ story: StoryblokStory; rels?: any[]; links?: any[] }>(
    `/cdn/stories/${clean}`,
    {
      token,
      version: versionParam(version),
      cv: String(Date.now()),
      resolve_links: "url",
    }
  );
  if (!data?.story) return null;
  return { story: data.story, rels: data.rels || [], links: data.links || [] };
}

/**
 * List all published stories (paginated). Used for sitemap generation.
 * Excludes drafts by using published version only.
 */
export async function listPublishedStories(): Promise<StoryblokStory[]> {
  if (!PUBLIC_TOKEN) return [];
  const stories: StoryblokStory[] = [];
  let page = 1;
  const perPage = 100;
  while (page <= 20) {
    const data = await sbFetch<{ stories: StoryblokStory[] }>(`/cdn/stories`, {
      token: PUBLIC_TOKEN,
      version: "published",
      per_page: String(perPage),
      page: String(page),
      excluding_fields: "content.body", // lighter payload; we still get content for seo checks if needed
    });
    const batch = data?.stories || [];
    stories.push(...batch);
    if (batch.length < perPage) break;
    page += 1;
  }
  return stories;
}

/**
 * Validate Storyblok Visual Editor preview token (_storyblok_tk).
 * Format: tk[space_id]=<id>&tk[timestamp]=<ts>&tk[token]=<sha1(space_id:preview_token:timestamp)>
 */
export function validateStoryblokPreviewToken(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>
): boolean {
  if (!PREVIEW_TOKEN || !SPACE_ID) return false;
  const get = (k: string) => {
    if (searchParams instanceof URLSearchParams) return searchParams.get(k);
    const v = (searchParams as any)[k];
    return Array.isArray(v) ? v[0] : v;
  };
  const spaceId = get("_storyblok_tk[space_id]") || get("space_id");
  const timestamp = get("_storyblok_tk[timestamp]") || get("timestamp");
  const token = get("_storyblok_tk[token]") || get("token");
  if (!spaceId || !timestamp || !token) return false;
  if (String(spaceId) !== String(SPACE_ID)) return false;
  // Allow 1 hour window
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  if (Math.abs(Date.now() / 1000 - ts) > 3600) return false;
  const expected = crypto
    .createHash("sha1")
    .update(`${spaceId}:${PREVIEW_TOKEN}:${timestamp}`)
    .digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
  } catch {
    return false;
  }
}

export function hasStoryblokEditorParams(
  searchParams: URLSearchParams | Record<string, string | string[] | undefined>
): boolean {
  const get = (k: string) => {
    if (searchParams instanceof URLSearchParams) return searchParams.get(k);
    const v = (searchParams as any)[k];
    return Array.isArray(v) ? v[0] : v;
  };
  return !!(
    get("_storyblok") ||
    get("_storyblok_tk[token]") ||
    get("_storyblok_release")
  );
}

export async function isDraftModeEnabled(): Promise<boolean> {
  try {
    const dm = await draftMode();
    if (dm.isEnabled) return true;
  } catch {
    // draftMode() may throw outside request contexts
  }
  try {
    const c = await cookies();
    return c.get(STORYBLOK_DRAFT_COOKIE)?.value === "1";
  } catch {
    return false;
  }
}

export function isStoryblokConfigured(): boolean {
  return !!(SPACE_ID && PUBLIC_TOKEN);
}

export function isPreviewConfigured(): boolean {
  return !!(SPACE_ID && PREVIEW_TOKEN);
}

/** Extract SEO metadata fields from a Storyblok story's content. */
export function extractSeo(story: StoryblokStory | null | undefined): {
  title?: string;
  description?: string;
  canonical?: string;
  noindex?: boolean;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  twitterTitle?: string;
  twitterDescription?: string;
  twitterImage?: string;
  structuredData?: any;
} {
  const c = story?.content || {};
  const seo = c.seo || c.seo_settings || c.meta || {};
  const pick = (...vals: any[]) => vals.find((v) => typeof v === "string" && v.trim())?.trim();
  const bool = (v: any) => v === true || v === "true" || v === 1;
  return {
    title: pick(seo.title, seo.seo_title, c.seo_title, c.meta_title, c.title, story?.name),
    description: pick(
      seo.description,
      seo.meta_description,
      c.seo_description,
      c.meta_description,
      c.description,
      c.excerpt
    ),
    canonical: pick(seo.canonical, seo.canonical_url, c.canonical, c.canonical_url),
    noindex: bool(seo.noindex ?? seo.no_index ?? c.noindex ?? c.no_index ?? c.robots_noindex),
    ogTitle: pick(seo.og_title, c.og_title),
    ogDescription: pick(seo.og_description, c.og_description),
    ogImage:
      pick(seo.og_image?.filename, seo.og_image, c.og_image?.filename, c.og_image) || undefined,
    twitterTitle: pick(seo.twitter_title, c.twitter_title),
    twitterDescription: pick(seo.twitter_description, c.twitter_description),
    twitterImage:
      pick(seo.twitter_image?.filename, seo.twitter_image, c.twitter_image?.filename, c.twitter_image) ||
      undefined,
    structuredData: seo.structured_data || c.structured_data || c.schema || undefined,
  };
}

export default {
  fetchStoryblokContent,
  fetchStoryblokEntries,
  getStoryblokPage,
  listPublishedStories,
  validateStoryblokPreviewToken,
  hasStoryblokEditorParams,
  isDraftModeEnabled,
  isStoryblokConfigured,
  isPreviewConfigured,
  extractSeo,
  STORYBLOK_DRAFT_COOKIE,
};
