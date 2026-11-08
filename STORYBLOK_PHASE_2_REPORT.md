# STORYBLOK_PHASE_2_REPORT.md — Theta PM Visual SEO Publishing System (Phase 2)

**Date:** 2026-05-10 (workspace execution)  
**Repository:** `okparannenna91-cloud/Theta` (branch `main`)  
**Scope:** Turn the existing Storyblok integration into a functional visual SEO publishing system for https://www.thetapm.site / https://thetapm.site (EU space “Theta PM SEO”), without deploying to production and without migrating/deleting/renaming/modifying existing indexed SEO pages.

> **Important:** Runtime tests requiring real Storyblok credentials, a deployed preview, or a full production build were **not executed** in this environment (partial workspace mirror; no real tokens/DB/full app deps configured). Where a check was not executed, it is reported as **not executed** with the reason. No test is claimed as passed unless actually executed.

---

## 1) Existing integration verification (inspection + local checks)

| Item | Result | Evidence / notes |
|---|---|---|
| Storyblok SDK compatibility (Next.js 14 / React 18) | **Compatible by peer deps/exports (verified locally)**; runtime visual editing **not executed** | Installed `@storyblok/react@2.4.8` (`peerDeps`: `react ^17||^18`, `react-dom ^17||^18`). Exports present: `storyblokInit`, `apiPlugin`, `useStoryblokState`, `storyblokEditable`, `StoryblokComponent`, `useStoryblokBridge`, `renderRichText`, `loadStoryblokBridge`/RSC entry available. No dependency upgrade performed (kept `^2.0.0` range; resolved 2.4.8). |
| Actual Storyblok API connectivity | **Not executed** | No `STORYBLOK_TOKEN`/space configured in workspace; cannot call Storyblok CDN. |
| Environment variable configuration | **Implemented/documented** | `.env.example` updated: `STORYBLOK_TOKEN`, `NEXT_PUBLIC_STORYBLOK_TOKEN` (bridge/public), `STORYBLOK_PREVIEW_TOKEN` (server-only), `STORYBLOK_SPACE_ID`, `STORYBLOK_API_REGION=eu`, `NEXT_PUBLIC_STORYBLOK_API_REGION=eu`. No credentials committed. |
| EU API endpoint | **Implemented** | `lib/storyblok.ts` reads `STORYBLOK_API_REGION` (default `eu` in example) and uses `https://api.storyblok.com/v2` CDN base; region is configurable. |
| Public token functionality | **Implemented (code path)**; **not executed** against API | Published fetches use `STORYBLOK_TOKEN` server-side (`version=published`, cached revalidate). |
| Preview token functionality | **Implemented (server-side only)**; **not executed** against API | Draft fetches use `STORYBLOK_PREVIEW_TOKEN` only on server; never exposed via `NEXT_PUBLIC_*` or response. |
| Draft content retrieval | **Implemented with validated access**; **not executed** | `getStoryblokPage(..., { preview: true })` / `fetchStoryblokContent(..., { version: 'draft' })` require preview token; draft API route requires validated draft context (see Security). |
| Visual Editor Bridge implementation | **Implemented**; **not executed** in Storyblok editor | Client `storyblokInit({ accessToken: NEXT_PUBLIC_STORYBLOK_TOKEN, bridge: true, components })` + `useStoryblokState` + `StoryblokComponent` in `components/storyblok/*`. CSP/frame-ancestors configured for `https://app.storyblok.com`. |

**Repo inspection performed (via GitHub/read):** `STORYBLOK_INTEGRATION_REPORT.md`, `package.json`, `app/sitemap.ts`, `robots.ts`, `lib/seo.ts`, `next.config.js`, `middleware.ts`, `app/(marketing)` routes, `components/seo/*`, `app/pricing` duplication, `tsconfig.json`. Existing integration was incomplete for Phase 2 goals (no dynamic renderer, no validated draft bridge flow, sitemap not merged with Storyblok, editor framing blocked by `X-Frame-Options: DENY`, legacy draft route lacked access validation) — corrected in code.

---

## 2) Visual Editor integration

Implemented (code) following Storyblok App Router/React bridge patterns:
- **Bridge/live editing:** `components/storyblok/StoryblokProvider.tsx` initializes `@storyblok/react` with `bridge: true` and public token; `components/storyblok/StoryblokStory.tsx` uses `useStoryblokState` for live content updates and `StoryblokComponent` for component selection/rendering. Components use `storyblokEditable(blok)`.
- **Draft preview:** `app/api/storyblok/draft/enable` validates Storyblok `_storyblok_tk` server-side (SHA1 `space_id:preview_token:timestamp`, 1h window, timing-safe compare), enables draft mode/cookie fallback, and redirects to a safe relative path. `draft/disable` clears draft state.
- **Preview URLs:** Visual Editor should use `https://www.thetapm.site/api/storyblok/draft/enable?redirect=<relative path>` (Storyblok appends editor params) or a direct page URL with validated `_storyblok_tk` params (handled by renderer preview resolution). Real path setting: Storyblok story `full_slug` should map to site path (e.g. `my-seo-page` → `/my-seo-page`).
- **Secure preview token handling:** `STORYBLOK_PREVIEW_TOKEN` read only in server module/functions; never in client components, never `NEXT_PUBLIC_*`, never returned in API responses.
- **Framing:** `next.config.js` removes `X-Frame-Options: DENY`, adds CSP `frame-ancestors 'self' https://app.storyblok.com` and allows Storyblok script/connect/img/frame domains; `a.storyblok.com` added to image `remotePatterns`.

**Not executed:** Live editing, component selection clicks, and live content updates inside the Storyblok Visual Editor (requires configured Storyblok space/tokens + deployed/accessible preview URL).

---

## 3) SEO page renderer

- **Route:** `app/(marketing)/[...slug]/page.tsx` (catch-all; route group does not add URL segment). Supports **root-level and nested SEO URLs** (e.g. `/storyblok-seo-page`, `/guides/new-storyblok-page` if not claimed by a static route).
- **Route precedence / existing pages preserved:** `[...slug]` is a catch-all that yields to **existing static/specific routes**. Root `/` remains owned by `app/page.tsx` (an earlier optional `[[...slug]]` was created then replaced/deleted to avoid root conflict — commit `2f65d744`). No existing marketing page files were modified, deleted, or renamed. `middleware.ts` now allows public page routes except protected app areas (`/dashboard`, `/settings`, `/onboarding`) so arbitrary Storyblok SEO URLs are reachable without bypassing app/API protections.
- **Published content:** fetched server-side via `getStoryblokPage(path, { preview:false })` using public token; published fetches use `next: { revalidate: 300 }` in lib.
- **Draft content (preview mode):** rendered when `_storyblok_tk` validates or validated draft cookie/context is active; drafts fetched with `cache: 'no-store'` and preview token server-side.
- **404:** `notFound()` when Storyblok not configured or story not found.
- **Metadata:** generated dynamically via `generateMetadata` (see SEO section). `SeoShell` used for consistent marketing layout.

**Not executed:** Runtime rendering of a real published/draft Storyblok page on the deployed site.

---

## 4) Reusable Storyblok-editable components

All implemented in `components/storyblok/components.tsx` with `storyblokEditable(blok)` and registered in `storyblokComponents` (plus common aliases):

| Required component | Implementation / keys |
|---|---|
| SEO Hero | `SeoHero` → `seo_hero`, `seo-hero`, `hero` |
| Rich Text | `RichTextBlock` (uses `renderRichText` for Storyblok rich text) → `rich_text`, `rich-text`, `richtext` |
| Image | `StoryblokImage` → `image`, `storyblok_image` |
| CTA Button | `CtaButton` → `cta_button`, `cta-button`, `cta` |
| Feature Grid | `FeatureGrid` → `feature_grid`, `feature-grid`, `features` |
| Comparison Table | `ComparisonTable` → `comparison_table`, `comparison-table` |
| FAQ | `FaqSection` → `faq`, `faq_section`, `faq-section` |
| Internal Links | `InternalLinks` → `internal_links`, `internal-links` |
| Related Articles | `RelatedArticles` → `related_articles`, `related-articles` |
| Screenshot Gallery | `ScreenshotGallery` → `screenshot_gallery`, `screenshot-gallery`, `screenshots`, `gallery` |

`Page`/`seo-page` render a `body` block array via `StoryblokComponent`. Field names are flexible (common alternatives supported) to ease Storyblok schema mapping; align actual Storyblok block/field technical names to the aliases above or adjust mappings.

---

## 5) SEO metadata

Supported and validated/coerced before rendering in `lib/storyblok.ts` (`extractSeo`) + `app/(marketing)/[...slug]/page.tsx` (`generateMetadata`):
- **SEO title / meta description:** from Storyblok SEO/content fields with fallbacks.
- **Canonical URL:** Storyblok canonical if absolute HTTP(S); otherwise `${BASE_URL}${urlPath}` (`BASE_URL=https://www.thetapm.site`). Emitted via `alternates.canonical`.
- **Robots index/noindex:** `robots` / `googleBot` set to `index,follow` or `noindex,nofollow` based on Storyblok noindex flags.
- **Open Graph:** title, description, URL, `siteName`, `type=article`, image (with size/alt fallback).
- **Twitter:** `summary_large_image`, title/description/image fallbacks.
- **Structured data:** JSON-LD script tags rendered only for safe object/array objects from `seo.structured_data`/`content.structured_data`/`schema` (no arbitrary HTML injection beyond controlled JSON serialization).

**Not executed:** Metadata output against real Storyblok content in a running Next app.

---

## 6) Sitemap integration

`app/sitemap.ts` was **extended, not replaced**:
- Preserves **all existing** `marketingPages` (68 entries) and `staticPages` (4 entries) — total 72 existing entries remain in source.
- Adds published Storyblok stories via `listPublishedStories()` (published version only, paginated).
- **Auto-discovers published pages** and maps `full_slug` to canonical URL.
- **Excludes** folders, `home` (already `/`), app-reserved namespaces (`api`, `dashboard`, `settings`, auth/reset paths, `invites`, `_next`), and pages marked **noindex**.
- **Avoids duplicates** by URL set (existing entries win).
- **Draft/unpublished pages excluded** because listing uses `version=published`.
- Fail-open: Storyblok fetch errors are logged and return no extra entries (existing sitemap still returned).

**Not executed:** Sitemap generation with real Storyblok credentials/data.

---

## 7) Security

- **Preview token never exposed:** `STORYBLOK_PREVIEW_TOKEN` used only server-side; not in `NEXT_PUBLIC_*`, not in client code, not returned by API routes.
- **Preview access validated:** `app/api/storyblok/draft/enable` requires valid `_storyblok_tk` (space/timestamp/token SHA1) before enabling draft; rejects invalid/absent validation. `app/api/storyblok/route.ts` (legacy preview endpoint) now requires active validated draft context (`isDraftModeEnabled` cookie/draftMode) for `version=draft` GET/POST; published reads remain allowed. No secret query params accepted.
- **No secret env vars committed:** `.env.example` contains placeholders/empty values only. Secret scan executed (see Tests) found only pre-existing placeholder patterns in `.env.example` (e.g. `whsec_xxxx`, `signkey-prod-xxxx`) — **not real secrets**; no Storyblok token values committed.
- **No public write endpoints introduced:** all added endpoints are read/redirect preview helpers; draft enable only affects the requesting session after token validation.
- **Redirect safety:** draft routes allow only relative same-site redirects (no `//`).

**Operational note:** `_storyblok_tk` validation follows the common Storyblok preview-token format; confirm behavior with the actual Storyblok space/editor during dashboard setup (clock skew/window and param naming).

---

## 8) Files created / modified (pushed to `main`)

| File | Change |
|---|---|
| `lib/storyblok.ts` | Rewritten: secure server-side integration, EU config, published/draft fetch, `getStoryblokPage`, paginated `listPublishedStories`, `_storyblok_tk` validation, draft mode/cookie helpers, SEO extraction. |
| `components/storyblok/StoryblokProvider.tsx` | Client bridge init (public token only). |
| `components/storyblok/StoryblokStory.tsx` | `useStoryblokState` + `StoryblokComponent` live-edit wrapper. |
| `components/storyblok/components.tsx` | Reusable editable components + registry/aliases (incl. Screenshot Gallery). |
| `app/(marketing)/[...slug]/page.tsx` | Dynamic Storyblok SEO renderer (metadata, draft/published, 404, structured data). |
| `app/api/storyblok/draft/enable/route.ts` | Validated draft preview enable + secure cookie fallback. |
| `app/api/storyblok/draft/disable/route.ts` | Draft disable. |
| `app/api/storyblok/route.ts` | Hardened legacy preview route: draft access requires validated draft context. |
| `app/sitemap.ts` | Extended async sitemap with deduped published Storyblok entries; preserves existing entries. |
| `middleware.ts` | Public Storyblok/API routes + public marketing/content pages; protects `/dashboard,/settings,/onboarding`; auth/rate-limit behavior preserved. |
| `next.config.js` | CSP `frame-ancestors` for Storyblok Visual Editor; Storyblok domains in script/img/connect/frame; removed `X-Frame-Options: DENY`; added `a.storyblok.com` image pattern. |
| `.env.example` | Added Storyblok env vars with server-only preview token guidance. |
| `STORYBLOK_PHASE_2_REPORT.md` | This report. |

**Commits (pushed):**
- `0f1e409` — Storyblok Phase 2 core (visual editor, renderer, reusable components, draft routes, legacy route hardening)
- `2f65d744` — catch-all precedence fix (`[...slug]` replaces `[[...slug]]`) + sitemap/middleware/next.config/.env.example
- `91cb0f8` — Screenshot Gallery component
- *(final commit will include this report)*

**Not modified:** existing indexed marketing/SEO page files, their content, or their canonical URLs. No migrations/deletions/renames of existing SEO pages. **No production deploy performed.**

---

## 9) Actual test results (executed)

| Test | Command | Result |
|---|---|---|
| SDK install + peer compatibility (local) | `node -e "require('./node_modules/@storyblok/react/package.json')..."` | **PASS (executed)** — `@storyblok/react 2.4.8`, peers include `react ^17||^18`, `react-dom ^17||^18`. Node `v26.13.0`, npm `11.20.0`. |
| SDK exports required for bridge/editing (local) | `node -e "...storyblokInit,useStoryblokState,storyblokEditable,StoryblokComponent,useStoryblokBridge,renderRichText,apiPlugin..."` | **PASS (executed)** — all `function`/`object` as expected. |
| Targeted TypeScript check for Phase 2 files (partial workspace) | `npx tsc --noEmit --skipLibCheck -p tsconfig.json` (grep Phase 2 files) | **PASS (executed, scoped)** — `tsc_exit=0`; grep for `lib/storyblok`, `components/storyblok`, `app/(marketing)/[...slug]`, `app/api/storyblok`, `app/sitemap`, `middleware.ts`, `next.config` returned **no matching errors**. (Full repo not present locally; result is scoped to available context.) |
| Secret/credential scan (Phase 2 files + env example) | `grep -RInE "sk_live|whsec_|signkey-prod-|...|STORYBLOK_*TOKEN=.{8,}..."` on changed files | **PASS with note (executed)** — exit 0 due to pre-existing **placeholders** in `.env.example` (`whsec_xxxx`, `signkey-prod-xxxx`); **no real Storyblok tokens/secrets committed**. |
| Existing route preservation (static analysis) | GitHub repo inspection + implementation review | **PASS (executed analysis)** — no existing marketing page files changed; catch-all is `[...slug]` under `(marketing)` and does not own `/` (`app/page.tsx` remains). Root `app/pricing` and all specific `app/(marketing)/**` routes remain more specific. |
| Production build | — | **Not executed** — partial workspace; full Next build requires complete app, Prisma, env/DB/services. Run `npm run build` in the full repo/CI with required env configured (without deploying). |
| Lint (full project) | — | **Not executed** — partial workspace; run `npm run lint` in full repo. |
| Storyblok API connectivity / published retrieval / draft retrieval | — | **Not executed** — requires real `STORYBLOK_SPACE_ID`, `STORYBLOK_TOKEN`, `STORYBLOK_PREVIEW_TOKEN`, `STORYBLOK_API_REGION=eu`. |
| Visual Editor functionality (live editing, component selection, live updates) | — | **Not executed** — requires Storyblok dashboard config + reachable preview URL with valid tokens. |
| Dynamic page rendering (runtime) / metadata generation (runtime) / sitemap generation (runtime with Storyblok data) | — | **Not executed** — requires running app + Storyblok content/credentials. |

---

## 10) Remaining limitations

1. **No runtime verification against real Storyblok space:** connectivity, published/draft fetch, Visual Editor bridge behavior, and dynamic metadata/sitemap output with live data must be validated after configuring env vars and Storyblok.
2. **Full build/lint not run here:** confirm `npm run lint` and `npm run build` pass in CI/full environment (Prisma generation and all app dependencies required).
3. **`_storyblok_tk` validation format:** implemented using the common SHA1 space/token/timestamp scheme with 1h window; verify against the current Storyblok Visual Editor token format for this space/SDK setup. If Storyblok uses a different validation contract, adjust `validateStoryblokPreviewToken` server-side only.
4. **Middleware public page behavior:** middleware treats non-protected page routes as public to allow Storyblok SEO URLs at arbitrary paths. This is intentional for CMS publishing but broadens public page access; protected app areas remain `/dashboard`, `/settings`, `/onboarding`. Review if any other private page namespaces exist.
5. **Rich text rendering:** uses `renderRichText` and renders resulting HTML in components; ensure Storyblok rich-text content is trusted/editor-controlled (standard for CMS) and consider additional sanitization if untrusted sources are ever introduced.
6. **Component field names:** flexible aliases added; Storyblok block technical names/fields must match the registry keys/expected props (see dashboard config below).
7. **Canonical/base URL convention:** code uses `https://www.thetapm.site` (matches existing `lib/seo.ts`/sitemap). Confirm canonical host matches the production/Google-indexed host.
8. **Draft cookie in iframes:** draft fallback cookie uses `SameSite=None; Secure` for Visual Editor iframe contexts; this requires HTTPS.

---

## 11) Manual Storyblok dashboard configuration still required

1. **Space & API tokens (EU “Theta PM SEO”):**
   - Set server env vars in deployment/CI (never commit): `STORYBLOK_SPACE_ID`, `STORYBLOK_TOKEN` (public/published), `STORYBLOK_PREVIEW_TOKEN` (server-only preview), `STORYBLOK_API_REGION=eu`.
   - Set client bridge vars (safe/public): `NEXT_PUBLIC_STORYBLOK_TOKEN` (public token) and `NEXT_PUBLIC_STORYBLOK_API_REGION=eu`.
2. **Visual Editor / Preview URL:**
   - Configure the default preview URL to: `https://www.thetapm.site/api/storyblok/draft/enable?redirect=/` (or use Storyblok’s real-path/preview settings as appropriate). Storyblok will append `_storyblok_tk` parameters used for server-side validation.
   - Set “Real path” / slug mapping so story `full_slug` resolves to the intended site path (e.g. `acme-seo-page` → `/acme-seo-page`). Root-level and nested slugs are supported by the catch-all renderer.
3. **Content types / blocks:** create a page content type (e.g. `page` or `seo-page`) with a `body` blocks field, plus blocks matching technical names/aliases: `seo_hero`, `rich_text`, `image`, `cta_button`, `feature_grid`, `comparison_table`, `faq`, `internal_links`, `related_articles`, `screenshot_gallery` (and/or the aliases registered). Add SEO fields (`seo`/`seo_settings`/`meta` nest or top-level fields) for title, description, canonical, noindex, OG/Twitter image fields, structured_data as supported by your schema.
4. **SEO field mapping (recommended):** `seo.title`, `seo.description`, `seo.canonical`, `seo.noindex`/`no_index`, `seo.og_title`, `seo.og_description`, `seo.og_image`, `seo.twitter_*`, `seo.structured_data` (JSON/object as appropriate) — code supports these and fallbacks.
5. **Publish workflow:** only **published** stories are fetched for public rendering/sitemap. Drafts appear only in validated preview/editor contexts. Verify publish/unpublish updates and sitemap regeneration behavior in the deployed environment.
6. **Domain/CSP:** ensure deployed host serves over HTTPS and CSP allows `https://app.storyblok.com` framing (already in `next.config.js`).
7. **Post-config validation (manual/runtime):** run the not-executed checks in Section 9 with real credentials and a deployed preview; execute full `npm run lint` + `npm run build`; verify a published Storyblok page renders at its canonical URL, drafts render only with validated preview, and existing 44 indexed pages/canonicals remain unchanged.

---

**Status:** Phase 2 implementation committed to `main` (no production deploy). This report documents actual executed checks and explicitly marks non-executed checks. Stop after implementation and reporting.
