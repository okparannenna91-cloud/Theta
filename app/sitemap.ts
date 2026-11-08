import { MetadataRoute } from "next";
import { listPublishedStories, extractSeo, isStoryblokConfigured } from "@/lib/storyblok";

const baseUrl = "https://www.thetapm.site";

const marketingPages: MetadataRoute.Sitemap = [
  { url: `${baseUrl}/`, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
  { url: `${baseUrl}/pricing`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/docs`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.7 },
  { url: `${baseUrl}/privacy`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  { url: `${baseUrl}/terms`, lastModified: new Date(), changeFrequency: "yearly", priority: 0.3 },
  { url: `${baseUrl}/project-management-software`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.9 },
  { url: `${baseUrl}/project-management-software/theta-vs-asana`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/project-management-software/theta-vs-clickup`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/project-management-software/theta-vs-jira`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/project-management-software/theta-vs-monday`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/project-management-software/theta-vs-notion`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/project-management-software/theta-vs-trello`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/project-management-software/theta-vs-wrike`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/alternatives/jira-alternative`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/alternatives/monday-alternative`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/alternatives/clickup-alternative`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/alternatives/trello-alternative`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/alternatives/notion-alternative`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/alternatives/microsoft-project-alternative`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/alternatives/asana-alternative`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/alternatives/basecamp-alternative`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/alternatives/hive-alternative`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/alternatives/smartsheet-alternative`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/alternatives/airtable-alternative`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/alternatives/teamwork-alternative`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/guides/kanban`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/guides/kanban-vs-scrum`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/guides/kanban-vs-scrum-vs-agile`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/guides/scrum-vs-waterfall`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/guides/what-is-agile`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/guides/what-is-a-gantt-chart`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/guides/what-is-a-sprint`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/guides/how-to-prioritize-tasks`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/guides/task-management-best-practices`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/guides/how-to-use-kanban`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/guides/project-management-framework`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/guides/team-management`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/guides/agile-methodology-guide`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/guides/how-to-set-project-goals`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/guides/how-to-manage-project-risks`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/guides/productivity-tools-for-teams`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/guides/how-to-choose-project-management-software`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/features/kanban-board`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/features/tasks`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/features/project-planning`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/features/timeline`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/features/gantt`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/features/collaboration`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/features/automation`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/features/portfolio`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/features/reports`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/features/calendar`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/features/milestones`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/features/inbox`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/features/integrations`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/about`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  { url: `${baseUrl}/careers`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  { url: `${baseUrl}/status`, lastModified: new Date(), changeFrequency: "weekly", priority: 0.6 },
  { url: `${baseUrl}/help`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  { url: `${baseUrl}/resources`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
  { url: `${baseUrl}/pricing/free-vs-pro`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/pricing/business`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/pricing/enterprise`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.8 },
  { url: `${baseUrl}/integrations/github`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
  { url: `${baseUrl}/integrations/slack`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.7 },
];

const staticPages: MetadataRoute.Sitemap = [
  { url: `${baseUrl}/sign-in`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  { url: `${baseUrl}/sign-up`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.5 },
  { url: `${baseUrl}/forgot-password`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
  { url: `${baseUrl}/reset-password`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
];

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
