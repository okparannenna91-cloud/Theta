import Link from "next/link";
import { ArrowRight, CheckCircle2, MessageCircleQuestion, Link2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface SeoSection {
  h2: string;
  paragraphs?: string[];
  bullets?: string[];
  h3s?: { heading: string; body?: string; bullets?: string[] }[];
  table?: { headers: string[]; rows: string[][] };
  screenshot?: string;
}

export interface FaqItem {
  q: string;
  a: string;
}

export interface SeoContentProps {
  breadcrumb: string[];
  title: string;
  intro: string[];
  sections: SeoSection[];
  faqs: FaqItem[];
  internalLinks: { label: string; href: string }[];
  cta?: { title: string; body: string; button: string; href?: string };
  schema?: Record<string, unknown>[];
}

export function SeoContent({
  breadcrumb,
  title,
  intro,
  sections,
  faqs,
  internalLinks,
  cta = { title: "Start free in minutes", body: "Create a workspace, invite your team, and plan your first project today.", button: "Get Started", href: "/sign-up" },
  schema = [],
}: SeoContentProps) {
  return (
    <article className="max-w-3xl mx-auto px-6 py-12 sm:py-16">
      {schema.map((s, i) => (
        <script
          key={i}
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(s) }}
        />
      ))}

      <nav className="text-xs text-muted-foreground mb-8 flex items-center gap-2 flex-wrap" aria-label="Breadcrumb">
        {breadcrumb.map((b, i) => {
          const isLast = i === breadcrumb.length - 1;
          return (
            <span key={i} className="flex items-center gap-2">
              {i > 0 && <span className="text-muted-foreground/40">/</span>}
              {isLast ? (
                <span className="text-foreground font-medium">{b}</span>
              ) : (
                <Link href={i === 0 ? "/" : "#"} className="hover:text-foreground transition-colors">{b}</Link>
              )}
            </span>
          );
        })}
      </nav>

      <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-foreground mb-6">{title}</h1>

      {intro.map((p, i) => (
        <p key={i} className="text-base text-muted-foreground leading-relaxed mb-4">{p}</p>
      ))}

      <div className="flex flex-wrap gap-3 my-8">
        {[cta.button, "View Pricing"].map((label, i) => (
          <Link key={label} href={i === 0 ? cta.href || "/sign-up" : "/pricing"}>
            <Button className={i === 0 ? "rounded-lg" : "rounded-lg"} variant={i === 0 ? "default" : "outline"}>
              {label}
              {i === 0 && <ArrowRight className="w-4 h-4 ml-1.5" />}
            </Button>
          </Link>
        ))}
      </div>

      {sections.map((section) => (
        <section key={section.h2} className="mt-12">
          <h2 className="text-2xl font-bold text-foreground mb-4">{section.h2}</h2>
          {section.paragraphs?.map((p, i) => (
            <p key={i} className="text-base text-muted-foreground leading-relaxed mb-4">{p}</p>
          ))}
          {section.bullets && (
            <ul className="space-y-2.5 my-4">
              {section.bullets.map((b, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed">
                  <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
          {section.table && (
            <div className="my-6 overflow-x-auto rounded-xl border border-border/40">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/40">
                    {section.table.headers.map((h, i) => (
                      <th key={i} className="px-4 py-3 text-left font-semibold text-foreground whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {section.table.rows.map((row, i) => (
                    <tr key={i}>
                      {row.map((cell, j) => (
                        <td key={j} className={`px-4 py-3 text-muted-foreground ${j === 0 ? "font-medium text-foreground" : ""}`}>
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {section.h3s?.map((h3) => (
            <div key={h3.heading} className="mt-6">
              <h3 className="text-lg font-semibold text-foreground mb-2">{h3.heading}</h3>
              {h3.body && <p className="text-base text-muted-foreground leading-relaxed mb-3">{h3.body}</p>}
              {h3.bullets && (
                <ul className="space-y-2.5 my-3">
                  {h3.bullets.map((b, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground leading-relaxed">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {section.screenshot && (
            <div className="aspect-video bg-muted/40 border border-border/40 rounded-xl flex items-center justify-center my-6">
              <span className="text-xs font-medium text-muted-foreground/70">{section.screenshot}</span>
            </div>
          )}
        </section>
      ))}

      <section className="mt-14">
        <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <MessageCircleQuestion className="h-5 w-5 text-primary" />
          Frequently Asked Questions
        </h2>
        <div className="divide-y divide-border/60 border border-border/40 rounded-xl overflow-hidden">
          {faqs.map((f, i) => (
            <details key={i} className="group">
              <summary className="cursor-pointer list-none px-5 py-4 text-sm font-medium text-foreground flex items-center justify-between gap-4 hover:bg-muted/30 transition-colors">
                {f.q}
                <span className="text-muted-foreground text-lg leading-none transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="px-5 pb-4 text-sm text-muted-foreground leading-relaxed">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <h2 className="text-2xl font-bold text-foreground mb-6 flex items-center gap-2">
          <Link2 className="h-5 w-5 text-primary" />
          Keep Reading
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          {internalLinks.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg border border-border/40 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
            >
              <span>{l.label}</span>
              <ArrowRight className="h-4 w-4 flex-shrink-0" />
            </Link>
          ))}
        </div>
      </section>

      <section className="mt-14 rounded-2xl border border-primary/20 bg-primary/5 p-8 text-center">
        <h2 className="text-2xl font-bold text-foreground mb-2">{cta.title}</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-6">{cta.body}</p>
        <Link href={cta.href || "/sign-up"}>
          <Button className="rounded-lg px-6">
            {cta.button} <ArrowRight className="w-4 h-4 ml-1.5" />
          </Button>
        </Link>
      </section>
    </article>
  );
}
