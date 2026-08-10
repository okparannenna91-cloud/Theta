import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";

const BASE = "https://thetapm.site";

export const metadata: Metadata = {
  title: "Project Planning Software: From Idea to Timeline",
  description: "Project planning software with milestones, timelines, dependencies, and Gantt charts. Plan the whole project, keep the roadmap visible, and adapt as you learn.",
  alternates: { canonical: `${BASE}/features/project-planning` },
  openGraph: {
    title: "Project Planning Software: From Idea to Timeline",
    description: "Milestones, timelines, dependencies, and Gantt charts in one place.",
    url: `${BASE}/features/project-planning`,
    siteName: "Theta PM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Project Planning Software: From Idea to Timeline",
    description: "Plan the whole project and keep the roadmap visible.",
    creator: "@theta_pm",
  },
};

const pageSchema = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Theta PM Project Planning Software",
    applicationCategory: "ProjectManagementApplication",
    operatingSystem: "Web",
    description: "Project planning with milestones, timelines, dependencies, and Gantt charts.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  },
];

export default function ProjectPlanningFeature() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Features", "Project Planning"]}
        title="Project Planning Software: From Idea to Timeline"
        intro={[
          "A good plan answers three questions before anyone starts: what are we building, in what order, and by when. Teams that skip the plan pay for it later — in missed dates, unclear ownership, and scope that quietly grows.",
          "Theta PM turns project planning into something you do in minutes, not workshops. Set milestones, lay out the timeline, add dependencies, and keep the roadmap visible to everyone who needs it.",
        ]}
        sections={[
          {
            h2: "Plan the Whole Project First",
            paragraphs: [
              "Start with the outcome and work backward. In Theta PM you define the project, add milestones for the major checkpoints, and then break each milestone into the tasks that get it done.",
            ],
            bullets: [
              "Projects hold the structure — goals, milestones, and the work itself.",
              "Milestones mark the moments that matter, so progress is obvious.",
              "Tasks carry ownership and dates, so the plan is executable, not abstract.",
            ],
            screenshot: "Screenshot: Theta PM project timeline with milestones and scheduled tasks.",
          },
          {
            h2: "A Timeline Everyone Can Read",
            paragraphs: [
              "A written plan in a spreadsheet is hard to see. A timeline shows the whole project at a glance: when each piece starts, when it lands, and whether the dates hold together.",
              "Theta PM's timeline view maps tasks to a schedule with milestones, so leadership and the team look at the same roadmap instead of two different documents.",
            ],
          },
          {
            h2: "Dependencies That Tell the Truth",
            paragraphs: [
              "Projects fail at handoffs. Dependencies make the handoffs visible: this task cannot start until that one finishes. When a delay happens, you see its impact on the whole plan immediately — and re-plan instead of discovering it at the deadline.",
            ],
          },
          {
            h2: "Gantt View for Complex Work",
            paragraphs: [
              "For projects with parallel tracks and tight sequencing, the Gantt view shows bars, dates, and dependencies together. It is the planning view teams reach for when the timeline alone is not enough.",
            ],
          },
          {
            h2: "Plans That Adapt",
            paragraphs: [
              "Plans change. Theta PM keeps the plan and the daily work on the same tasks, so when reality shifts, the roadmap updates instead of rotting in a document nobody reopens.",
            ],
            bullets: [
              "Move dates and see the schedule respond in every view.",
              "Automate status handoffs so the plan reflects reality.",
              "Keep the board for daily execution and the timeline for the roadmap — same data.",
            ],
          },
          {
            h2: "From Plan to Execution Without a Handoff",
            paragraphs: [
              "The plan becomes the work. The tasks you place on the timeline are the same tasks the team moves on the kanban board. Nothing gets re-entered, and the plan never drifts from what is actually happening.",
            ],
          },
        ]}
        faqs={[
          {
            q: "What is project planning software?",
            a: "Project planning software helps you define a project's scope, milestones, timeline, and dependencies before and during execution. It turns a rough idea into a schedule the whole team can follow.",
          },
          {
            q: "Can I create a project roadmap in Theta PM?",
            a: "Yes. Add milestones and lay out tasks on the timeline to build a clear roadmap that stays in sync with the actual work.",
          },
          {
            q: "Does Theta PM support Gantt charts?",
            a: "Yes. The Gantt view shows tasks, dates, and dependencies together, which is ideal for complex, tightly sequenced projects.",
          },
          {
            q: "Can tasks depend on each other in the plan?",
            a: "Yes. Set dependencies and the timeline and Gantt views will show which work is blocked and by what.",
          },
          {
            q: "Is planning separate from tracking?",
            a: "No. In Theta PM, planning and tracking use the same tasks. The timeline is your plan, the board is your daily execution — and they never disagree.",
          },
        ]}
        internalLinks={[
          { label: "Team Collaboration Software", href: "/features/collaboration" },
          { label: "Gantt Chart Software", href: "/features/gantt" },
          { label: "Kanban Guide", href: "/guides/kanban" },
          { label: "Task Management Software", href: "/features/tasks" },
          { label: "Best Project Management Software 2026", href: "/project-management-software" },
        ]}
        schema={pageSchema}
      />
    </SeoShell>
  );
}
