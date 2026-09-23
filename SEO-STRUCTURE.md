# Theta PM — SEO Page Structure Blueprint

## Architecture Overview

```
app/
├── layout.tsx                    ← Root layout: Organization + WebSite JSON-LD, OG, Twitter, metadata
├── page.tsx                      ← Home/Landing page: SoftwareApplication JSON-LD
├── sitemap.ts                    ← Sitemap: all marketing + static pages
├── robots.ts                     ← Robots.txt: disallows /api/, /dashboard/, /settings/
├── error.tsx                     ← Error boundary (noIndex)
├── not-found.tsx                 ← 404 page (noIndex) + popular pages grid
│
├── (marketing)/                  ← Marketing route group (public pages)
│   ├── about/page.tsx            ← About: breadcrumb, sections, FAQs, internal links
│   ├── careers/page.tsx          ← Careers: breadcrumb, sections, FAQs, internal links
│   ├── help/page.tsx             ← Help Center: sections, FAQs, internal links
│   ├── resources/page.tsx        ← Resources: sections, FAQs, internal links
│   ├── status/page.tsx           ← System Status: sections, FAQs, internal links
│   │
│   ├── alternatives/             ← Competitor comparison pages
│   │   ├── clickup-alternative/
│   │   ├── jira-alternative/
│   │   ├── monday-alternative/
│   │   ├── notion-alternative/
│   │   ├── trello-alternative/
│   │   ├── microsoft-project-alternative/
│   │   ├── asana-alternative/
│   │   ├── basecamp-alternative/
│   │   ├── hive-alternative/
│   │   ├── smartsheet-alternative/
│   │   ├── airtable-alternative/
│   │   └── teamwork-alternative/
│   │
│   ├── docs/page.tsx             ← Documentation
│   ├── privacy/page.tsx          ← Privacy Policy
│   ├── terms/page.tsx            ← Terms of Service
│   │
│   ├── features/                 ← Feature pages (all have sections, FAQs, internal links)
│   │   ├── tasks/page.tsx
│   │   ├── gantt/page.tsx
│   │   ├── collaboration/page.tsx
│   │   ├── inbox/page.tsx
│   │   ├── calendar/page.tsx
│   │   ├── milestones/page.tsx
│   │   ├── portfolio/page.tsx
│   │   ├── reports/page.tsx
│   │   ├── automation/page.tsx
│   │   ├── integrations/page.tsx
│   │   ├── timeline/page.tsx
│   │   └── kanban-board/page.tsx
│   │
│   ├── guides/                   ← Guide pages (all have sections, FAQs, internal links)
│   │   ├── kanban/page.tsx
│   │   ├── kanban-vs-scrum/page.tsx
│   │   ├── kanban-vs-scrum-vs-agile/page.tsx
│   │   ├── scrum-vs-waterfall/page.tsx
│   │   ├── what-is-agile/page.tsx
│   │   ├── what-is-a-sprint/page.tsx
│   │   ├── what-is-a-gantt-chart/page.tsx
│   │   ├── how-to-use-kanban/page.tsx
│   │   ├── task-management-best-practices/page.tsx
│   │   ├── how-to-prioritize-tasks/page.tsx
│   │   ├── how-to-set-project-goals/page.tsx
│   │   ├── how-to-manage-project-risks/page.tsx
│   │   ├── how-to-choose-project-management-software/page.tsx
│   │   ├── project-management-framework/page.tsx
│   │   ├── agile-methodology-guide/page.tsx
│   │   ├── team-management/page.tsx
│   │   └── productivity-tools-for-teams/page.tsx
│   │
│   ├── pricing/                  ← Pricing pages
│   │   ├── free-vs-pro/page.tsx
│   │   ├── business/page.tsx
│   │   └── enterprise/page.tsx
│   │
│   ├── project-management-software/  ← Comparison hub + vs pages
│   │   ├── page.tsx              ← Main comparison hub
│   │   ├── theta-vs-asana/page.tsx
│   │   ├── theta-vs-clickup/page.tsx
│   │   ├── theta-vs-jira/page.tsx
│   │   ├── theta-vs-monday/page.tsx
│   │   ├── theta-vs-notion/page.tsx
│   │   ├── theta-vs-trello/page.tsx
│   │   └── theta-vs-wrike/page.tsx
│   │
│   └── integrations/             ← Integration pages
│       ├── github/page.tsx
│       └── slack/page.tsx
│
├── sign-in/                      ← Auth pages (layout.tsx has metadata)
│   └── [...sign-in]/page.tsx
├── sign-up/                      ← Auth pages (layout.tsx has metadata)
│   └── [...sign-up]/page.tsx
├── forgot-password/page.tsx      ← Auth (layout.tsx has metadata)
├── reset-password/page.tsx       ← Auth (layout.tsx has metadata)
├── invites/                      ← Invite page
│   └── [token]/page.tsx
├── (onboarding)/                 ← Onboarding flow
│   └── onboarding/page.tsx
│
└── (dashboard)/                  ← Dashboard (internal, not indexed)
    ├── dashboard/
    ├── projects/
    ├── boards/
    ├── tasks/
    ├── teams/
    ├── workspaces/
    └── ... (all internal)
```

## Component Hierarchy

```
app/layout.tsx
├── JsonLd (organizationSchema + webSiteSchema)
├── ThemeProvider → QueryProvider → WorkspaceProvider → AblyProvider → PostHogProvider → PopupProvider → I18nProvider
│   └── RootLayout
│       ├── SeoShell (for marketing pages)
│       │   ├── Sticky Nav (Logo, Comparisons, Alternatives, Guides, Features, Pricing, Sign In, Get Started)
│       │   ├── main > SeoContent
│       │   │   ├── BreadcrumbList JSON-LD (auto-generated)
│       │   │   ├── Custom JSON-LD schemas (via schema prop)
│       │   │   ├── FAQPage JSON-LD (auto-generated when faqs present)
│       │   │   ├── Breadcrumb nav (clickable links)
│       │   │   ├── h1 Title
│       │   │   ├── Intro paragraphs
│       │   │   ├── CTA section
│       │   │   ├── Sections (h2 + paragraphs/bullets/tables/h3s/screenshots)
│       │   │   ├── FAQ section (accordion)
│       │   │   ├── Keep Reading section (internalLinks)
│       │   │   └── Final CTA section
│       │   └── Footer (Product/Resources links, Privacy, Terms, Docs)
│       └── LandingPage (for home page)
│           ├── SoftwareApplication JSON-LD (inline)
│           ├── HeroSection
│           ├── ProblemSection
│           ├── HowItWorksSection
│           ├── EcosystemSection
│           ├── DifferentiatorsSection
│           ├── IdeaToDeliverySection
│           ├── BuiltForTeamsSection
│           ├── SecuritySection
│           ├── PricingFaqSection
│           └── FinalCtaSection
│
lib/seo.ts
├── BASE_URL = "https://www.thetapm.site"
├── buildMetadata() → generates full Metadata object
├── buildArticleMetadata() → Article type
├── buildFAQPageMetadata() → FAQ type
├── organizationSchema → Organization JSON-LD
├── webSiteSchema → WebSite JSON-LD
├── faqSchema(faqs) → FAQPage JSON-LD
└── breadcrumbSchema(items) → BreadcrumbList JSON-LD

components/seo/
├── seo-shell.tsx ← Layout wrapper with nav + footer
├── seo-content.tsx ← Main content component with breadcrumbs + sections + FAQs
└── json-ld.tsx ← Generic JSON-LD script component
```

## Sitemap Structure

```
sitemap.ts
├── marketingPages (68 entries)
│   ├── / (priority 1.0, daily)
│   ├── /pricing (0.8, monthly)
│   ├── /docs (0.7, weekly)
│   ├── /privacy (0.3, yearly)
│   ├── /terms (0.3, yearly)
│   ├── /project-management-software (0.9, monthly)
│   ├── /project-management-software/theta-vs-* (0.8, monthly) × 7
│   ├── /alternatives/*-alternative (0.8, monthly) × 11
│   ├── /guides/* (0.7, monthly) × 16
│   ├── /features/* (0.8, monthly) × 12
│   ├── /about (0.6, monthly)
│   ├── /careers (0.5, monthly)
│   ├── /status (0.6, weekly)
│   ├── /help (0.6, monthly)
│   ├── /resources (0.6, monthly)
│   ├── /pricing/free-vs-pro, /pricing/business, /pricing/enterprise (0.8, monthly)
│   └── /integrations/github, /integrations/slack (0.7, monthly)
└── staticPages (4 entries)
    ├── /sign-in (0.5, monthly)
    ├── /sign-up (0.5, monthly)
    ├── /forgot-password (0.4, monthly)
    └── /reset-password (0.4, monthly)
```

## Cross-Link Architecture

### Internal Link Pattern
Each page links to:
- **Pricing** → `/pricing`
- **Get Started** → `/sign-up`
- **Documentation** → `/docs`
- **Related Guides** → `/guides/*`
- **Features** → `/features/*`
- **Alternatives** → `/alternatives/*`

### Breadcrumb Structure
```
Home → [Category] → [Subcategory] → [Page]
Example: Home → Features → Tasks → (current page)
URL: /features/tasks
```

### Schema Hierarchy
```
Organization Schema (root layout)
├── WebSite Schema (root layout)
├── SoftwareApplication Schema (landing page)
├── BreadcrumbList Schema (every SeoContent page)
├── FAQPage Schema (pages with FAQs)
├── Article Schema (comparison/guide pages)
└── HowTo Schema (practical guide pages)
```

## Fix Summary

### What was fixed:
| Issue | Fix |
|-------|-----|
| Mixed `www` vs non-`www` canonical URLs | Standardized to `https://www.thetapm.site` |
| Breadcrumb links used `href="#"` | Fixed to `getBreadcrumbHref()` with lowercase slugs |
| No BreadcrumbList JSON-LD | Added via `breadcrumbSchema()` in SeoContent |
| No FAQPage JSON-LD | Auto-generated when FAQs are present |
| Slash-notation breadcrumbs | Split into proper arrays |
| Auth pages missing metadata | Already had layout.tsx metadata |
| Empty sections={[]} | Added real content sections, FAQs, internal links |
| Empty internalLinks={[]} | Added relevant internal links |
| 404 page minimal | Added description, popular pages grid, internal links |
| `invites/[token]` literal path | Fixed to `/invites/accept` |
| `breadcrumbSchema` had URL construction bug | Fixed to match `getBreadcrumbHref` |
| Two `(marketing` directories | Merged into single `(marketing)` route group (63 pages) |

## Pages Still Needing Attention

- **`/docs` page** — Needs content verification
- **Dashboard pages** — Internal only, no SEO metadata (intentional)
- **`/features/project-planning`** — May need content sections/FAQs
- **`next build` verification** — Run full build to confirm all routes resolve correctly
