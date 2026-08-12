import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";

const BASE = "https://thetapm.site";

export const metadata: Metadata = {
  title: "Gantt Chart Software: Plan, Sequence, and Track (2026)",
  description: "Gantt chart software with dependencies, scheduling, and real-time updates. See the whole project on one timeline and keep it in sync with daily work.",
  alternates: { canonical: `${BASE}/features/gantt` },
  openGraph: {
    title: "Gantt Chart Software: Plan, Sequence, and Track (2026)",
    description: "Dependencies, scheduling, and real-time updates on one timeline.",
    url: `${BASE}/features/gantt`,
    siteName: "Theta PM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gantt Chart Software: Plan, Sequence, and Track (2026)",
    description: "See the whole project on one timeline.",
    creator: "@theta_pm",
  },
};

const pageSchema = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Theta PM Gantt Chart Software",
    applicationCategory: "ProjectManagementApplication",
    operatingSystem: "Web",
    description: "Gantt charts with dependencies, scheduling, and real-time updates.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  },
];

export default function GanttFeature() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Features", "Gantt"]}
        title="Gantt Chart Software for Teams That Plan in Time (2026)"
        intro={[
          "A Gantt chart shows the entire project on one timeline: what starts when, what overlaps, and what depends on what. It is the view project managers reach for when a simple list cannot answer 'will we actually finish on time?'",
          "Theta PM's Gantt view turns your tasks into a live schedule with dependencies and working-day scheduling — and because it reads from the same tasks as your board, the chart never drifts from the work.",
        ]}
        sections={[
          {
            h2: "See the Whole Project at a Glance",
            paragraphs: [
              "Every task appears as a bar on the timeline, sized by its duration and placed by its dates. Overlaps, gaps, and the critical path are visible instantly — no mental math required.",
            ],
            bullets: [
              "Task bars with clear start and end dates.",
              "Milestones marked on the timeline so major checkpoints stand out.",
              "Colors and structure that make progress obvious at a glance.",
            ],
            screenshot: "Screenshot: Theta PM Gantt view with task bars, milestones, and dependency links.",
          },
          {
            h2: "Dependencies That Keep the Schedule Honest",
            paragraphs: [
              "When tasks are linked, the chart shows exactly how work flows — this must finish before that starts. If a predecessor slips, the impact on downstream tasks is visible immediately, so you re-plan early instead of discovering it at the deadline.",
            ],
          },
          {
            h2: "Working-Day Scheduling",
            paragraphs: [
              "The Gantt view schedules work against working days, so the timeline reflects when people are actually available rather than counting calendar days that nobody works. The result is a schedule the team can believe in.",
            ],
          },
          {
            h2: "Plan in Gantt, Execute on the Board",
            paragraphs: [
              "A Gantt chart is only useful if it stays current. In Theta PM, the tasks on the Gantt are the same tasks the team drags across the kanban board. Move a card, reschedule a task, and the chart updates — you never maintain a separate plan.",
            ],
          },
          {
            h2: "When to Use a Gantt Chart",
            h3s: [
              {
                heading: "Complex, sequenced projects",
                body: "Multiple workstreams that must land in order — a Gantt chart keeps the sequence visible.",
              },
              {
                heading: "Fixed deadlines",
                body: "When a launch date cannot move, the Gantt shows what has to give to make it.",
              },
              {
                heading: "Stakeholder communication",
                body: "A single timeline answers 'what is happening and when' for leadership and clients.",
              },
            ],
          },
          {
            h2: "The Best of Both: Gantt and Kanban",
            paragraphs: [
              "Some teams live in the Gantt, others in the kanban board. Theta PM gives both views over the same tasks, so the planner and the executor are looking at the same truth. That is the difference between a Gantt tool and a project management platform.",
            ],
          },
        ]}
        faqs={[
          {
            q: "What is a Gantt chart used for?",
            a: "A Gantt chart shows a project on a timeline, with each task as a bar between its start and end date. It is used to plan sequences, spot overlaps, track progress, and see the impact of delays.",
          },
          {
            q: "Does Theta PM have a free Gantt chart?",
            a: "Yes. The Gantt view is included in Theta PM's free tier, along with boards, timelines, and calendar views.",
          },
          {
            q: "Can I set dependencies in the Gantt view?",
            a: "Yes. Link tasks as dependencies and the Gantt chart will show how delays in one task affect the rest of the schedule.",
          },
          {
            q: "Does the Gantt chart stay in sync with my kanban board?",
            a: "Yes. Both views read from the same tasks. Move a card on the board and the Gantt reflects the new status — no duplicate data entry.",
          },
          {
            q: "Is a Gantt chart the same as a timeline?",
            a: "A timeline shows tasks and milestones along a schedule. A Gantt chart adds bars for duration and dependency links, making it more detailed for complex scheduling. Theta PM offers both.",
          },
        ]}
        internalLinks={[
          { label: "Task Management Software", href: "/features/tasks" },
          { label: "Project Planning Software", href: "/features/project-planning" },
          { label: "Kanban Board Software", href: "/features/kanban-board" },
          { label: "What is a Gantt Chart", href: "/guides/what-is-a-gantt-chart" },
          { label: "Microsoft Project Alternative", href: "/alternatives/microsoft-project-alternative" },
          { label: "Jira Alternative", href: "/alternatives/jira-alternative" },
          { label: "Best Project Management Software 2026", href: "/project-management-software" },
        ]}
        schema={pageSchema}
      />
    </SeoShell>
  );
}
