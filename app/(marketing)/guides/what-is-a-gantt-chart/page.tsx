import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";

const BASE = "https://thetapm.site";

export const metadata: Metadata = {
  title: "What is a Gantt Chart? A Beginner's Guide (2026)",
  description: "What is a Gantt chart? Learn how Gantt charts work, what the bars and lines mean, and when to use one for project planning and scheduling.",
  alternates: { canonical: `${BASE}/guides/what-is-a-gantt-chart` },
  openGraph: {
    title: "What is a Gantt Chart? A Beginner's Guide (2026)",
    description: "How Gantt charts work, what the bars and lines mean, and when to use one.",
    url: `${BASE}/guides/what-is-a-gantt-chart`,
    siteName: "Theta PM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "What is a Gantt Chart? A Beginner's Guide (2026)",
    description: "The whole project, on one timeline.",
    creator: "@theta_pm",
  },
};

const pageSchema = [
  {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "What is a Gantt Chart? A Beginner's Guide (2026)",
    description: "A beginner's guide to Gantt charts: how they work, what the bars mean, and when to use one.",
    author: { "@type": "Organization", name: "Theta PM Systems" },
    publisher: { "@type": "Organization", name: "Theta PM Systems" },
  },
];

export default function WhatIsAGanttChart() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Guides", "What is a Gantt Chart"]}
        title="What is a Gantt Chart?"
        intro={[
          "A Gantt chart is a bar chart laid against a calendar. Each task in a project becomes a bar stretching from its start date to its end date, and the bars line up side by side so the whole project fits on one timeline.",
          "It is the classic tool for answering 'will we actually finish on time?' In this guide you will learn what the bars and lines mean, when a Gantt chart is worth using, and how modern tools keep it honest.",
        ]}
        sections={[
          {
            h2: "Anatomy of a Gantt Chart",
            paragraphs: [
              "Every Gantt chart is built from the same pieces.",
            ],
            bullets: [
              "Timeline along the top — days, weeks, or months.",
              "Task bars — each task as a horizontal bar between its start and end date.",
              "Milestones — diamond-shaped markers for major checkpoints.",
              "Dependency lines — arrows showing which task must finish before another starts.",
              "Progress — shading inside the bar showing how much of the task is done.",
            ],
            screenshot: "Screenshot: Theta PM Gantt view with task bars, milestones, and dependency links.",
          },
          {
            h2: "What a Gantt Chart Tells You",
            paragraphs: [
              "A Gantt chart answers three questions that lists and boards answer poorly.",
            ],
            h3s: [
              {
                heading: "What overlaps?",
                body: "Bars stacked at the same time show when two efforts compete for the same people or attention.",
              },
              {
                heading: "What depends on what?",
                body: "Dependency arrows show the sequence of work — and exactly which tasks are at risk when one slips.",
              },
              {
                heading: "What has to give to hit the date?",
                body: "When a deadline cannot move, the chart shows which tasks can compress, shift, or drop to make the date.",
              },
            ],
          },
          {
            h2: "When to Use a Gantt Chart",
            bullets: [
              "Sequenced projects — many tasks that must land in order.",
              "Fixed deadlines — launch dates that cannot move.",
              "Multiple workstreams — teams feeding one milestone.",
              "Stakeholder communication — one picture beats a status report.",
            ],
          },
          {
            h2: "When a Gantt Chart Is Overkill",
            paragraphs: [
              "For a short list of independent tasks, a Gantt chart adds noise without adding information. Boards and lists handle that kind of work better. Gantt charts earn their place when sequencing and dates matter more than card counts.",
            ],
          },
          {
            h2: "The Classic Gantt Problem: It Goes Stale",
            paragraphs: [
              "Traditional Gantt tools died in spreadsheets and desktop files. Someone updated the chart, someone else did the work, and within two weeks the chart was fiction.",
              "Modern project management solves that by making the chart read from live tasks. In Theta PM, the Gantt view shows the same tasks your team drags across the kanban board. Move a card, reschedule a task, and the chart updates in real time — the plan cannot drift from the work because they are the same data.",
            ],
            bullets: [
              "The Gantt is a view of live tasks, not a separate file.",
              "Dependencies and working-day scheduling keep dates realistic.",
              "Board, timeline, Gantt, and calendar stay in sync automatically.",
            ],
            screenshot: "Screenshot: Theta PM Gantt view next to the same project's kanban board.",
          },
          {
            h2: "Gantt Chart vs Timeline vs Roadmap",
            paragraphs: [
              "The three are close cousins, and teams use the names loosely.",
            ],
            bullets: [
              "Timeline — tasks and milestones in sequence; the big-picture line.",
              "Gantt chart — the timeline plus duration bars and dependency links; the detailed schedule.",
              "Roadmap — high-level phases and themes for stakeholders; less detail, more direction.",
            ],
          },
        ]}
        faqs={[
          {
            q: "What is a Gantt chart used for?",
            a: "A Gantt chart shows a project on a calendar timeline, with each task as a bar between its start and end date. Teams use it to plan sequences, spot overlaps, track progress, and see the impact of delays.",
          },
          {
            q: "How do you read a Gantt chart?",
            a: "Read left to right across the calendar. Each bar is a task; its length is its duration. Arrows between bars show dependencies — the first task must finish before the next starts. Diamonds mark milestones.",
          },
          {
            q: "What is a milestone on a Gantt chart?",
            a: "A milestone is a zero-duration marker for a major checkpoint — design approved, build started, launch. It shows when an important event happens, not how long it takes.",
          },
          {
            q: "Are Gantt charts still used?",
            a: "Yes — they remain the standard for sequenced projects with fixed deadlines. Modern tools like Theta PM keep them in sync with live tasks so they do not go stale.",
          },
          {
            q: "Can I use a Gantt chart and a kanban board together?",
            a: "Yes, and that combination is the sweet spot. The Gantt answers 'what is happening and when'; the board answers 'what do I do next'. Theta PM keeps both views on the same tasks.",
          },
        ]}
        internalLinks={[
          { label: "Gantt Chart Software", href: "/features/gantt" },
          { label: "Project Timeline Software", href: "/features/timeline" },
          { label: "Project Planning Software", href: "/features/project-planning" },
          { label: "Kanban Guide", href: "/guides/kanban" },
        ]}
        schema={pageSchema}
      />
    </SeoShell>
  );
}
