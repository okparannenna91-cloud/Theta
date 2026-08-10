import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";

const BASE = "https://thetapm.site";

export const metadata: Metadata = {
  title: "Team Collaboration Software: Work Together in Real Time",
  description: "Team collaboration software with comments, mentions, activity feeds, and inbox notifications. Keep discussion next to the work, not lost in chat.",
  alternates: { canonical: `${BASE}/features/collaboration` },
  openGraph: {
    title: "Team Collaboration Software: Work Together in Real Time",
    description: "Comments, mentions, activity feeds, and inbox notifications.",
    url: `${BASE}/features/collaboration`,
    siteName: "Theta PM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Team Collaboration Software: Work Together in Real Time",
    description: "Keep discussion next to the work, not lost in chat.",
    creator: "@theta_pm",
  },
};

const pageSchema = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Theta PM Team Collaboration Software",
    applicationCategory: "ProjectManagementApplication",
    operatingSystem: "Web",
    description: "Real-time team collaboration with comments, mentions, activity feeds, and inbox notifications.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  },
];

export default function CollaborationFeature() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Features", "Collaboration"]}
        title="Team Collaboration Software That Puts Discussion Next to the Work"
        intro={[
          "Teams that work in one chat app and track work in another spend half their day copying context between them. The fix is not another communication tool — it is collaboration attached to the work itself.",
          "Theta PM keeps every conversation, mention, and update attached to the task it belongs to, in real time. Your team gets the speed of chat with the structure of a project plan.",
        ]}
        sections={[
          {
            h2: "Real-Time, Without Refreshing",
            paragraphs: [
              "When a teammate moves a task, comments on a card, or updates a status, everyone sees it instantly. The plan is never stale, and nobody works from an outdated screenshot.",
            ],
          },
          {
            h2: "Comments and Mentions on the Work",
            paragraphs: [
              "Discuss a task where the task lives. Mention a teammate with @ and they get notified — the context is already attached, so there is no 'see the link in the chat' dance.",
            ],
            bullets: [
              "Comments stay on the task with a full history.",
              "Mentions route the right people to the right conversation.",
              "Decisions are recorded next to the work, not buried in a chat scroll.",
            ],
            screenshot: "Screenshot: A task thread showing comments, mentions, and the activity feed.",
          },
          {
            h2: "An Activity Feed That Replaces Status Meetings",
            paragraphs: [
              "The activity feed shows what changed, who changed it, and when — across the project. Leaders see progress without asking, and the team stops doing updates as a separate job.",
            ],
          },
          {
            h2: "An Inbox That Catches Everything",
            paragraphs: [
              "Assignments, mentions, and replies flow into a unified inbox, so nothing important slips through. Filter by assigned, mentions, or replies and deal with what matters instead of what is loudest.",
            ],
          },
          {
            h2: "Collaboration Across Time Zones",
            paragraphs: [
              "Remote and async teams work at different hours. Because every update is recorded and every conversation is attached to the work, the morning team picks up exactly where the evening team left off.",
            ],
          },
          {
            h2: "Team Views and Clear Ownership",
            paragraphs: [
              "See who is assigned what, view work by team, and keep a single source of truth for who owns each deliverable. Collaboration works best when ownership is visible.",
            ],
          },
        ]}
        faqs={[
          {
            q: "Do I still need a separate chat app?",
            a: "Many teams keep a chat app for quick social messages, but task discussion belongs in the project. Theta PM's comments, mentions, and activity feed cover the work-related conversations that usually flood group chats.",
          },
          {
            q: "How does mentioning teammates work?",
            a: "Use @ followed by a name in a comment and the teammate is notified through their inbox. The comment stays attached to the task with full context.",
          },
          {
            q: "Can leadership see progress without asking?",
            a: "Yes. The activity feed and project views show what changed and when, so status can be checked instead of requested.",
          },
          {
            q: "Is Theta PM good for remote teams?",
            a: "Yes. Real-time updates, attached conversations, and an inbox for notifications make it easy for async teams in different time zones to stay aligned.",
          },
          {
            q: "Does collaboration work on the free plan?",
            a: "Yes. Comments, mentions, activity feeds, and notifications are available on Theta PM's free tier.",
          },
        ]}
        internalLinks={[
          { label: "Theta PM vs Asana", href: "/project-management-software/theta-vs-asana" },
          { label: "Task Management Software", href: "/features/tasks" },
          { label: "Kanban Board Software", href: "/features/kanban-board" },
          { label: "Project Planning Software", href: "/features/project-planning" },
          { label: "Best Project Management Software 2026", href: "/project-management-software" },
          { label: "Pricing", href: "/pricing" },
        ]}
        schema={pageSchema}
      />
    </SeoShell>
  );
}
