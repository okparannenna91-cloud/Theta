import type { Metadata } from "next";

export const BASE_URL = "https://www.thetapm.site";
export const SITE_NAME = "Theta PM";

/** Update when page copy changes so sitemap lastmod and Article dates stay honest. */
export const SITE_CONTENT_UPDATED = "2026-11-11";

const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`;

/** Google truncates descriptions around 158 characters. */
const MAX_DESCRIPTION = 158;

/**
 * The root layout applies the `%s | Theta PM` title template, so any page title
 * that already ends with the brand would render as "... | Theta PM | Theta PM".
 */
const BRAND_TAIL = /\s*[|·—–-]\s*Theta PM\s*$/i;

function stripDuplicateBrand(title: string): string {
  const stripped = title.replace(BRAND_TAIL, "").trim();
  return stripped.length > 0 ? stripped : title.trim();
}

/** Trim to a word boundary so metadata never cuts mid-word. */
function clampDescription(description: string): string {
  const trimmed = description.trim().replace(/\s+/g, " ");
  if (trimmed.length <= MAX_DESCRIPTION) return trimmed;
  const cut = trimmed.slice(0, MAX_DESCRIPTION);
  const lastSpace = cut.lastIndexOf(" ");
  const bounded = lastSpace > 100 ? cut.slice(0, lastSpace) : cut;
  return bounded.replace(/[,;:.\s]+$/, "");
}

export function buildMetadata(params: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  images?: string[];
  noIndex?: boolean;
}): Metadata {
  const { path, type = "website", images = [DEFAULT_OG_IMAGE], noIndex = false } = params;
  const title = stripDuplicateBrand(params.title);
  const description = clampDescription(params.description);
  const url = `${BASE_URL}${path}`;

  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    authors: [{ name: "Theta PM Systems", url: BASE_URL }],
    creator: "Theta PM Systems",
    publisher: "Theta PM Systems",
    alternates: { canonical: url },
    robots: {
      index: !noIndex,
      follow: !noIndex,
      googleBot: {
        index: !noIndex,
        follow: !noIndex,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
    openGraph: {
      title,
      description,
      url,
      siteName: SITE_NAME,
      type,
      images: images.map((img) => ({ url: img, width: 1200, height: 630, alt: title })),
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      creator: "@theta_pm",
      images,
    },
  };
}

export function buildArticleMetadata(params: {
  title: string;
  description: string;
  path: string;
  author: string;
  publishedTime?: string;
  modifiedTime?: string;
  images?: string[];
}): Metadata {
  const { author, publishedTime, modifiedTime, ...rest } = params;
  const base = buildMetadata({ ...rest, type: "article" });
  return {
    ...base,
    openGraph: {
      ...base.openGraph,
      type: "article",
      ...(publishedTime ? { publishedTime } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
    },
  };
}

export function buildFAQPageMetadata(params: {
  title: string;
  description: string;
  path: string;
}): Metadata {
  const base = buildMetadata({ ...params, type: "article" });
  return {
    ...base,
    openGraph: { ...base.openGraph, type: "article" },
  };
}

export const organizationSchema = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: SITE_NAME,
  url: BASE_URL,
  logo: {
    "@type": "ImageObject",
    url: `${BASE_URL}/Logo.png`,
  },
  description: "Theta PM is a project management platform for teams that plan, execute, and report in one workspace.",
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "customer support",
    url: `${BASE_URL}/help`,
    availableLanguage: ["en"],
  },
  sameAs: [
    "https://x.com/Theta_PM",
    "https://www.linkedin.com/company/theta-pm",
    "https://www.github.com/thetapm",
  ],
};

export const webSiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: BASE_URL,
  description: "Theta PM is a project management platform for teams that plan, execute, and report in one workspace.",
  inLanguage: "en",
  publisher: {
    "@type": "Organization",
    name: SITE_NAME,
    url: BASE_URL,
    logo: `${BASE_URL}/Logo.png`,
  },
};

export const faqSchema = (faqs: { q: string; a: string }[]) => ({
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqs.map((f) => ({
    "@type": "Question",
    name: f.q,
    acceptedAnswer: {
      "@type": "Answer",
      text: f.a,
    },
  })),
});

export const breadcrumbSchema = (items: string[]) => ({
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: items.map((item, i) => {
    if (i === 0) {
      return { "@type": "ListItem", position: 1, name: item, item: BASE_URL };
    }
    const pathParts = items.slice(1, i);
    const pathStr = "/" + pathParts.map((s) => s.toLowerCase().replace(/\s+/g, "-")).join("/");
    return { "@type": "ListItem", position: i + 1, name: item, item: `${BASE_URL}${pathStr}` };
  }),
});

/**
 * Article schema for guides, comparisons, and docs-style pages.
 *
 * Includes author/publisher and dates so pages are eligible for article
 * rich results and carry visible freshness signals.
 */
export function articleSchema(params: {
  title: string;
  description: string;
  path: string;
  type?: "Article" | "TechArticle" | "BlogPosting";
}) {
  const url = `${BASE_URL}${params.path}`;
  const headline = stripDuplicateBrand(params.title);
  return {
    "@context": "https://schema.org",
    "@type": params.type ?? "Article",
    headline,
    description: clampDescription(params.description),
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    url,
    image: [DEFAULT_OG_IMAGE],
    author: { "@type": "Organization", name: "Theta PM Systems", url: BASE_URL },
    publisher: {
      "@type": "Organization",
      name: "Theta PM Systems",
      url: BASE_URL,
      logo: { "@type": "ImageObject", url: `${BASE_URL}/Logo.png` },
    },
    datePublished: SITE_CONTENT_UPDATED,
    dateModified: SITE_CONTENT_UPDATED,
    inLanguage: "en",
  };
}
