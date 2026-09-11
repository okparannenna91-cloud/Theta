import type { Metadata } from "next";

export const BASE_URL = "https://www.thetapm.site";
export const SITE_NAME = "Theta PM";

const DEFAULT_OG_IMAGE = `${BASE_URL}/og-image.png`;

export function buildMetadata(params: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article";
  images?: string[];
  noIndex?: boolean;
}): Metadata {
  const { title, description, path, type = "website", images = [DEFAULT_OG_IMAGE], noIndex = false } = params;
  const url = `${BASE_URL}${path}`;

  return {
    metadataBase: new URL(BASE_URL),
    title,
    description,
    keywords: [
      "project management software",
      "task management tool",
      "team collaboration platform",
      "kanban boards",
      "real-time collaboration",
      "Gantt charts",
      "theta pm",
      title,
    ],
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
  const { title, description, path, type = "article", images, publishedTime, modifiedTime } = params;
  const base = buildMetadata({ ...params, type, images });
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
  logo: `${BASE_URL}/Logo.png`,
  description: "Theta PM is the next evolution of project synchronization.",
  contactPoint: {
    "@type": "ContactPoint",
    telephone: "+1-000-000-0000",
    contactType: "support",
    url: BASE_URL,
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
  description: "Theta PM is the next evolution of project synchronization.",
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
  itemListElement: items.map((item, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: item,
    item: i === 0 ? BASE_URL : `${BASE_URL}${items.slice(1, i + 1).map(encodeURIComponent).join("/")}`,
  })),
});
