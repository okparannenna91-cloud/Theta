import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { draftMode } from "next/headers";
import { SeoShell } from "@/components/seo/seo-shell";
import StoryblokStoryClient from "@/components/storyblok/StoryblokStory";
import {
  getStoryblokPage,
  extractSeo,
  hasStoryblokEditorParams,
  validateStoryblokPreviewToken,
  isDraftModeEnabled,
  isStoryblokConfigured,
  isPreviewConfigured,
} from "@/lib/storyblok";
import { BASE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic"; // allow draft/preview; published fetches are cached in lib
export const revalidate = 0;

type Props = {
  params: Promise<{ slug?: string[] }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function slugToPath(slug?: string[]): string {
  if (!slug || slug.length === 0) return "home";
  return slug.join("/");
}

function slugToUrlPath(slug?: string[]): string {
  if (!slug || slug.length === 0) return "/";
  return `/${slug.join("/")}`;
}

async function resolvePreview(searchParams: Record<string, string | string[] | undefined>): Promise<boolean> {
  if (hasStoryblokEditorParams(searchParams) && validateStoryblokPreviewToken(searchParams)) return true;
  if (isPreviewConfigured() && (await isDraftModeEnabled())) return true;
  return false;
}

function safeStructuredData(data: any): Record<string, unknown>[] {
  if (!data) return [];
  const arr = Array.isArray(data) ? data : [data];
  return arr.filter((x) => x && typeof x === "object" && !Array.isArray(x)) as Record<string, unknown>[];
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  if (!isStoryblokConfigured()) return {};
  const { slug } = await params;
  const sp = await searchParams;
  const preview = await resolvePreview(sp);
  const path = slugToPath(slug);
  const result = await getStoryblokPage(path, { preview });
  if (!result?.story) return {};
  const seo = extractSeo(result.story);
  const urlPath = slugToUrlPath(slug);
  const canonical = seo.canonical && seo.canonical.startsWith("http")
    ? seo.canonical
    : `${BASE_URL}${urlPath}`;
  const title = seo.title || result.story.name || "Theta PM";
  const description = seo.description || "Theta PM project management.";
  const ogImage = seo.ogImage || `${BASE_URL}/og-image.png`;

  return {
    title,
    description,
    alternates: { canonical },
    robots: seo.noindex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : { index: true, follow: true },
    openGraph: {
      title: seo.ogTitle || title,
      description: seo.ogDescription || description,
      url: canonical,
      siteName: "Theta PM",
      type: "article",
      images: [{ url: ogImage, width: 1200, height: 630, alt: seo.ogTitle || title }],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.twitterTitle || seo.ogTitle || title,
      description: seo.twitterDescription || seo.ogDescription || description,
      images: [seo.twitterImage || ogImage],
    },
  };
}

export default async function StoryblokCatchAllPage({ params, searchParams }: Props) {
  if (!isStoryblokConfigured()) notFound();
  const { slug } = await params;
  const sp = await searchParams;
  const preview = await resolvePreview(sp);
  const path = slugToPath(slug);
  const result = await getStoryblokPage(path, { preview });
  if (!result?.story) notFound();

  const seo = extractSeo(result.story);
  const schemas = safeStructuredData(seo.structuredData);

  return (
    <SeoShell>
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }} />
      ))}
      {preview ? (
        <StoryblokStoryClient story={result.story} />
      ) : (
        <StoryblokStoryClient story={result.story} />
      )}
    </SeoShell>
  );
}
