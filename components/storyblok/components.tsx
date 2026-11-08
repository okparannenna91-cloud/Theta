"use client";

import { storyblokEditable, renderRichText } from "@storyblok/react";
import Image from "next/image";
import Link from "next/link";
import type { ComponentType } from "react";

type Blok = { component: string; _uid?: string; [k: string]: any };

function asText(v: any): string {
  return typeof v === "string" ? v : "";
}

function asArray<T = any>(v: any): T[] {
  return Array.isArray(v) ? v : [];
}

export function SeoHero({ blok }: { blok: Blok }) {
  return (
    <section
      {...storyblokEditable(blok)}
      className="relative overflow-hidden rounded-2xl border border-border/40 bg-gradient-to-b from-primary/5 to-background px-6 py-14 sm:px-10"
    >
      {blok.eyebrow ? (
        <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-primary">{asText(blok.eyebrow)}</p>
      ) : null}
      <h1 className="max-w-3xl text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        {asText(blok.title || blok.headline)}
      </h1>
      {blok.subtitle || blok.description ? (
        <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
          {asText(blok.subtitle || blok.description)}
        </p>
      ) : null}
      {blok.cta_text && blok.cta_url ? (
        <div className="mt-8">
          <Link
            href={asText(blok.cta_url) || "/sign-up"}
            className="inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {asText(blok.cta_text)}
          </Link>
        </div>
      ) : null}
    </section>
  );
}

export function RichTextBlock({ blok }: { blok: Blok }) {
  const html =
    blok.content && typeof blok.content === "object"
      ? renderRichText(blok.content)
      : null;
  return (
    <section {...storyblokEditable(blok)} className="prose prose-invert max-w-none">
      {html ? (
        <div dangerouslySetInnerHTML={{ __html: html }} />
      ) : blok.text ? (
        <p className="text-base leading-relaxed text-muted-foreground">{asText(blok.text)}</p>
      ) : null}
    </section>
  );
}

export function StoryblokImage({ blok }: { blok: Blok }) {
  const src = blok.image?.filename || blok.src || blok.filename;
  if (!src || typeof src !== "string") return <div {...storyblokEditable(blok)} />;
  const alt = asText(blok.alt || blok.image?.alt || blok.caption || "Image");
  return (
    <figure {...storyblokEditable(blok)} className="my-6">
      <div className="relative overflow-hidden rounded-xl border border-border/40">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="h-auto w-full" loading="lazy" />
      </div>
      {blok.caption ? (
        <figcaption className="mt-2 text-center text-xs text-muted-foreground">{asText(blok.caption)}</figcaption>
      ) : null}
    </figure>
  );
}

export function CtaButton({ blok }: { blok: Blok }) {
  const href = asText(blok.url || blok.href || blok.link?.cached_url || blok.link?.url || "/sign-up");
  const label = asText(blok.text || blok.label || "Learn more");
  const variant = asText(blok.variant);
  const secondary = variant === "secondary" || variant === "outline";
  return (
    <div {...storyblokEditable(blok)} className="my-4">
      <Link
        href={href.startsWith("http") ? href : href.startsWith("/") ? href : `/${href}`}
        className={
          secondary
            ? "inline-flex items-center rounded-lg border border-border px-5 py-2.5 text-sm font-medium text-foreground hover:bg-muted/40"
            : "inline-flex items-center rounded-lg bg-primary px-5 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        }
      >
        {label}
      </Link>
    </div>
  );
}

export function FeatureGrid({ blok }: { blok: Blok }) {
  const items = asArray(blok.features || blok.items);
  return (
    <section {...storyblokEditable(blok)} className="my-10">
      {blok.title ? <h2 className="mb-6 text-2xl font-bold text-foreground">{asText(blok.title)}</h2> : null}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item: any, i: number) => (
          <div key={item?._uid || i} className="rounded-xl border border-border/40 bg-card p-5">
            <h3 className="text-base font-semibold text-foreground">{asText(item?.title || item?.name)}</h3>
            {item?.description ? (
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{asText(item.description)}</p>
            ) : null}
          </div>
        ))}
      </div>
    </section>
  );
}

export function ComparisonTable({ blok }: { blok: Blok }) {
  const headers = asArray(blok.headers || blok.columns).map(asText).filter(Boolean);
  const rows = asArray(blok.rows);
  return (
    <section {...storyblokEditable(blok)} className="my-8">
      {blok.title ? <h2 className="mb-4 text-2xl font-bold text-foreground">{asText(blok.title)}</h2> : null}
      <div className="overflow-x-auto rounded-xl border border-border/40">
        <table className="w-full text-sm">
          {headers.length ? (
            <thead>
              <tr className="bg-muted/40">
                {headers.map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left font-semibold text-foreground whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody className="divide-y divide-border/40">
            {rows.map((row: any, i: number) => {
              const cells = Array.isArray(row) ? row : asArray(row?.cells || row?.values);
              return (
                <tr key={row?._uid || i}>
                  {cells.map((cell: any, j: number) => (
                    <td key={j} className={`px-4 py-3 text-muted-foreground ${j === 0 ? "font-medium text-foreground" : ""}`}>
                      {asText(cell?.text ?? cell?.value ?? cell)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function FaqSection({ blok }: { blok: Blok }) {
  const items = asArray(blok.items || blok.faqs || blok.questions);
  return (
    <section {...storyblokEditable(blok)} className="my-10">
      <h2 className="mb-6 text-2xl font-bold text-foreground">{asText(blok.title || "Frequently Asked Questions")}</h2>
      <div className="divide-y divide-border/60 overflow-hidden rounded-xl border border-border/40">
        {items.map((item: any, i: number) => (
          <details key={item?._uid || i} className="group">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-sm font-medium text-foreground hover:bg-muted/30">
              {asText(item?.question || item?.q)}
              <span className="text-lg leading-none text-muted-foreground transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">
              {asText(item?.answer || item?.a)}
            </p>
          </details>
        ))}
      </div>
    </section>
  );
}

export function InternalLinks({ blok }: { blok: Blok }) {
  const items = asArray(blok.links || blok.items);
  return (
    <section {...storyblokEditable(blok)} className="my-10">
      <h2 className="mb-4 text-2xl font-bold text-foreground">{asText(blok.title || "Keep Reading")}</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {items.map((item: any, i: number) => {
          const href = asText(item?.url || item?.href || item?.link?.cached_url || item?.link?.url);
          const label = asText(item?.label || item?.text || item?.title);
          if (!href) return null;
          return (
            <Link
              key={item?._uid || i}
              href={href.startsWith("http") ? href : href.startsWith("/") ? href : `/${href}`}
              className="rounded-lg border border-border/40 px-4 py-3 text-sm text-muted-foreground hover:border-primary/40 hover:text-foreground"
            >
              {label || href}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function RelatedArticles({ blok }: { blok: Blok }) {
  const items = asArray(blok.articles || blok.items);
  return (
    <section {...storyblokEditable(blok)} className="my-10">
      <h2 className="mb-4 text-2xl font-bold text-foreground">{asText(blok.title || "Related Articles")}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {items.map((item: any, i: number) => {
          const href = asText(item?.url || item?.full_slug || item?.link?.cached_url);
          return (
            <Link
              key={item?._uid || i}
              href={href ? (href.startsWith("/") ? href : `/${href}`) : "#"}
              className="rounded-xl border border-border/40 bg-card p-5 hover:border-primary/40"
            >
              <h3 className="font-semibold text-foreground">{asText(item?.title || item?.name)}</h3>
              {item?.excerpt || item?.description ? (
                <p className="mt-2 text-sm text-muted-foreground">{asText(item.excerpt || item.description)}</p>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

export function Page({ blok }: { blok: Blok }) {
  const body = asArray(blok.body);
  // Lazy import pattern not needed; use registry lookup safely at render time.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { StoryblokComponent } = require("@storyblok/react");
  return (
    <main {...storyblokEditable(blok)} className="mx-auto max-w-3xl space-y-8 px-6 py-12 sm:py-16">
      {body.map((nested: any) => (
        <StoryblokComponent blok={nested} key={nested?._uid || nested?.component} />
      ))}
    </main>
  );
}

export const storyblokComponents: Record<string, ComponentType<any>> = {
  page: Page,
  "seo-page": Page,
  seo_hero: SeoHero,
  "seo-hero": SeoHero,
  hero: SeoHero,
  rich_text: RichTextBlock,
  "rich-text": RichTextBlock,
  richtext: RichTextBlock,
  image: StoryblokImage,
  storyblok_image: StoryblokImage,
  cta_button: CtaButton,
  "cta-button": CtaButton,
  cta: CtaButton,
  feature_grid: FeatureGrid,
  "feature-grid": FeatureGrid,
  features: FeatureGrid,
  comparison_table: ComparisonTable,
  "comparison-table": ComparisonTable,
  faq: FaqSection,
  faq_section: FaqSection,
  "faq-section": FaqSection,
  internal_links: InternalLinks,
  "internal-links": InternalLinks,
  related_articles: RelatedArticles,
  "related-articles": RelatedArticles,
};
