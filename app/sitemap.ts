import { MetadataRoute } from "next";
import { listPublishedStories, extractSeo, isStoryblokConfigured } from "@/lib/storyblok";

const baseUrl = "https://www.thetapm.site";

/**
 * Fixed content date instead of `new Date()`. A lastmod that changes on every
 * request teaches Google to ignore the signal entirely.
 */
const CONTENT_UPDATED = new Date("2026-11-11T00:00:00.000Z");

const marketingPages: MetadataRoute.Sitemap = [
  { url: `${baseUrl}/`, lastModified: CONTENT_UPDATED, changeFrequency: "daily", priority: 1 },
  { url: `${baseUrl}/pricing`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/docs`, lastModified: CONTENT_UPDATED, changeFrequency: "weekly", priority: 0.7 },
  { url: `${baseUrl}/privacy`, lastModified: CONTENT_UPDATED, changeFrequency: "yearly", priority: 0.3 },
  { url: `${baseUrl}/terms`, lastModified: CONTENT_UPDATED, changeFrequency: "yearly", priority: 0.3 },
  { url: `${baseUrl}/project-management-software`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.9 },
  { url: `${baseUrl}/cornerstone`, lastModified: CONTENT_UPDATED, changeFrequency: "weekly", priority: 0.9 },
  { url: `${baseUrl}/project-management-software/theta-vs-asana`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/project-management-software/theta-vs-clickup`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/project-management-software/theta-vs-jira`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/project-management-software/theta-vs-monday`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/project-management-software/theta-vs-notion`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/project-management-software/theta-vs-trello`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/project-management-software/theta-vs-wrike`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/alternatives/jira-alternative`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/alternatives/monday-alternative`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/alternatives/clickup-alternative`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/alternatives/trello-alternative`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/alternatives/notion-alternative`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/alternatives/microsoft-project-alternative`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/alternatives/asana-alternative`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/alternatives/basecamp-alternative`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/alternatives/hive-alternative`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/alternatives/smartsheet-alternative`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/alternatives/airtable-alternative`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/alternatives/teamwork-alternative`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/guides/kanban`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/guides/kanban-vs-scrum`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/guides/kanban-vs-scrum-vs-agile`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/guides/scrum-vs-waterfall`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/guides/what-is-agile`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/guides/what-is-a-gantt-chart`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/guides/what-is-a-sprint`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/guides/how-to-prioritize-tasks`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/guides/task-management-best-practices`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/guides/how-to-use-kanban`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/guides/project-management-framework`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/guides/team-management`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/guides/agile-methodology-guide`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/guides/how-to-set-project-goals`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/guides/how-to-manage-project-risks`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/guides/productivity-tools-for-teams`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/guides/how-to-choose-project-management-software`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/features/kanban-board`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/features/tasks`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/features/project-planning`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/features/timeline`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/features/gantt`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/features/collaboration`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/features/automation`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/features/portfolio`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/features/reports`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/features/calendar`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/features/milestones`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/features/inbox`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/features/integrations`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/about`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.6 },
  { url: `${baseUrl}/careers`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.5 },
  { url: `${baseUrl}/status`, lastModified: CONTENT_UPDATED, changeFrequency: "weekly", priority: 0.6 },
  { url: `${baseUrl}/help`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.6 },
  { url: `${baseUrl}/resources`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.6 },
  { url: `${baseUrl}/pricing/free-vs-pro`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/pricing/business`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/pricing/enterprise`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/integrations/github`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/integrations/slack`, lastModified: CONTENT_UPDATED, changeFrequency: "monthly", priority: 0.7 },
];

// Auth screens are deliberately excluded: they are not landing pages and only
// spend crawl budget that the marketing pages need.
const staticPages: MetadataRoute.Sitemap = [];

async function getStoryblokSitemapEntries(): Promise<MetadataRoute.Sitemap> {
  if (!isStoryblokConfigured()) return [];
  try {
    const stories = await listPublishedStories();
    const entries: MetadataRoute.Sitemap = [];
    for (const story of stories) {
      // Published stories only (listPublishedStories uses published version). Exclude folders/system entries.
      if ((story as any).is_folder) continue;
      const full = (story.full_slug || story.slug || "").replace(/^\/+|\/+$/g, "");
      if (!full || full === "home") continue; // home maps to / which is already in marketingPages
      // Exclude paths that conflict with app routes/namespaces.
      if (/^(api|dashboard|settings|sign-in|sign-up|forgot-password|reset-password|invites|_next)(\/|$)/.test(full)) continue;

      const seo = extractSeo(story);
      if (seo.noindex) continue;
      const canonical = seo.canonical && seo.canonical.startsWith(baseUrl)
        ? seo.canonical
        : `${baseUrl}/${full}`;
      // Avoid duplicating existing sitemap entries.
      entries.push({
        url: canonical,
        lastModified: story.published_at ? new Date(story.published_at) : story.updated_at ? new Date(story.updated_at) : new Date(),
        changeFrequency: "weekly",
        priority: 0.7,
      });
    }
    return entries;
  } catch (err) {
    console.error("[sitemap] Storyblok entries fetch failed:", err);
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const existing = [...marketingPages, ...staticPages];
  const storyblok = await getStoryblokSitemapEntries();
  const seen = new Set(existing.map((e) => e.url));
  const merged = [...existing];
  for (const entry of storyblok) {
    if (!seen.has(entry.url)) {
      seen.add(entry.url);
      merged.push(entry);
    }
  }
  return merged;
}
