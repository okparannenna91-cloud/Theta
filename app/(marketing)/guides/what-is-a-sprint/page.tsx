import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";

const BASE = "https://thetapm.site";

export const metadata: Metadata = {
  title: "What is a Sprint in Scrum? A Beginner's Guide (2026)",
  description: "What is a sprint in Scrum? Learn how sprints work, how long they last, what happens inside one, and how to run your first sprint with a kanban board.",
  alternates: { canonical: `${BASE}/guides/what-is-a-sprint` },
  openGraph: {
    title: "What is a Sprint in Scrum? A Beginner's Guide (2026)",
    description: "How sprints work, how long they last, and how to run one.",
    url: `${BASE}/guides/what-is-a-sprint`,
    siteName: "Theta PM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "What is a Sprint in Scrum? A Beginner's Guide (2026)",
    description: "Small goals, short cycles, fast feedback.",
    creator: "@theta_pm",
  },
};

const pageSchema = [
  {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "What is a Sprint in Scrum? A Beginner's Guide (2026)",
    description: "A beginner's guide to sprints: how they work, how long they last, and how to run your first one.",
    author: { "@type": "Organization", name: "Theta PM Systems" },
    publisher: { "@type": "Organization", name: "Theta PM Systems" },
  },
];

export default function WhatIsASprint() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Guides", "What is a Sprint"]}
        title="What is a Sprint in Scrum?"
        intro={[
          "A sprint is a short, fixed-length period — usually one to four weeks — in which a team commits to delivering a specific slice of usable work. When the sprint ends, the team shows what it built, learns from the feedback, and plans the next sprint.",
          "Sprints are the heartbeat of Scrum. They turn a big, fuzzy project into a series of small, achievable goals. This guide explains how sprints work, what happens inside one, and how to run your first sprint.",
        ]}
        sections={[
          {
            h2: "The Idea in One Sentence",
            paragraphs: [
              "A sprint is a promise: for a fixed amount of time, the team works only on one agreed set of tasks, and at the end there is something real to show for it.",
              "The time box matters more than the length. Because the deadline is fixed, the team trims scope instead of stretching time — which is exactly what keeps work focused.",
            ],
          },
          {
            h2: "How Long Should a Sprint Be?",
            paragraphs: [
              "The classic sprint length is two weeks — long enough to make real progress, short enough that feedback arrives quickly. One-week sprints suit fast-moving product teams; four-week sprints suit bigger, steadier work.",
              "Whatever you pick, keep it consistent. A reliable rhythm is more valuable than the perfect number of days.",
            ],
            bullets: [
              "1 week — very fast feedback, more planning overhead.",
              "2 weeks — the most common balance for most teams.",
              "3–4 weeks — longer horizons, fewer ceremonies.",
            ],
          },
          {
            h2: "What Happens Inside a Sprint",
            h3s: [
              {
                heading: "1. Sprint planning",
                body: "The team picks the top items from the backlog it believes it can finish, and agrees on the sprint goal. The sprint's scope is locked — no new work joins mid-sprint.",
              },
              {
                heading: "2. Daily work",
                body: "Each day the team moves tasks forward on the board, and holds a short standup to surface blockers. Status lives on the board, not in reports.",
              },
              {
                heading: "3. Sprint review",
                body: "At the end, the team demonstrates what it built. Stakeholders react, and that feedback shapes the next sprint.",
              },
              {
                heading: "4. Retrospective",
                body: "The team reflects on how it worked together and picks one or two improvements for the next sprint. Small adjustments, applied every sprint, compound.",
              },
            ],
            screenshot: "Screenshot: Theta PM kanban board with sprint columns and a sprint goal field.",
          },
          {
            h2: "Sprint vs Backlog vs Board",
            paragraphs: [
              "These three live together and are easy to confuse.",
            ],
            bullets: [
              "Backlog — every piece of work the team might do, prioritized.",
              "Sprint — the short slice of the backlog the team commits to right now.",
              "Board — the visual view of where each task in the sprint currently stands.",
            ],
          },
          {
            h2: "The Sprint Goal: Why It Matters",
            paragraphs: [
              "A sprint goal is one sentence describing what this sprint should achieve — 'make signup work for new users' instead of a list of 40 tickets. It keeps decisions consistent: when something comes up, the team asks 'does this serve the goal?' If not, it waits.",
            ],
          },
          {
            h2: "Why Sprints Work",
            bullets: [
              "Fixed time + fixed scope = real focus.",
              "Feedback arrives while the work is still fresh.",
              "Failures are small, cheap, and quick to recover from.",
              "Progress is visible every sprint, not just at the end.",
            ],
          },
          {
            h2: "How to Run Your First Sprint With a Kanban Board",
            paragraphs: [
              "You do not need certification or ceremony to start. A simple board with Backlog, In Progress, and Done columns is enough for a first sprint.",
              "In Theta PM, create a project, add your top tasks to the backlog, pick the ones for the sprint, and work the board. The timeline and Gantt views show how the sprint fits the bigger project — same tasks, different views.",
            ],
            bullets: [
              "Pick a two-week window and commit to a small set of tasks.",
              "Write a one-sentence sprint goal.",
              "Move cards on the board daily; unblock each other at the standup.",
              "At the end, show the work, then pick one improvement for next time.",
            ],
          },
        ]}
        faqs={[
          {
            q: "What is a sprint in Scrum, in simple terms?",
            a: "A sprint is a fixed-length period — usually two weeks — in which the team works only on one agreed set of tasks, and delivers something usable at the end.",
          },
          {
            q: "How long is a typical sprint?",
            a: "Two weeks is the most common length. One-week sprints suit fast-moving teams; three to four weeks suit longer-horizon work. Consistency matters more than the exact length.",
          },
          {
            q: "Can the sprint scope change mid-sprint?",
            a: "In classic Scrum, no — the scope is locked at planning to protect focus. If reality demands it, the sprint can be cancelled, but that is an exception, not a habit.",
          },
          {
            q: "What happens at the end of a sprint?",
            a: "The team reviews what it built with stakeholders, runs a short retrospective on how it worked together, then plans the next sprint with what it learned.",
          },
          {
            q: "Do I need special software to run sprints?",
            a: "A simple kanban board with backlog, in progress, and done columns is enough to start. Theta PM adds sprint-friendly views — board, timeline, and Gantt — over the same tasks.",
          },
        ]}
        internalLinks={[
          { label: "Scrum vs Waterfall", href: "/guides/scrum-vs-waterfall" },
          { label: "Kanban vs Scrum", href: "/guides/kanban-vs-scrum" },
          { label: "Kanban Guide", href: "/guides/kanban" },
          { label: "Kanban Board Software", href: "/features/kanban-board" },
        ]}
        schema={pageSchema}
      />
    </SeoShell>
  );
}
