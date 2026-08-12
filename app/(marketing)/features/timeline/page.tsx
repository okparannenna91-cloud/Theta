import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";

const BASE = "https://thetapm.site";

export const metadata: Metadata = {
  title: "Project Timeline Software: Plan and Track Schedules (2026)",
  description: "Project timeline software with milestones, drag-and-drop scheduling, and real-time updates. See every project on one timeline and keep it in sync with daily work.",
  alternates: { canonical: `${BASE}/features/timeline` },
  openGraph: {
    title: "Project Timeline Software: Plan and Track Schedules (2026)",
    description: "Milestones, drag-and-drop scheduling, and real-time updates on one timeline.",
    url: `${BASE}/features/timeline`,
    siteName: "Theta PM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Project Timeline Software: Plan and Track Schedules (2026)",
    description: "See the whole project on one line.",
    creator: "@theta_pm",
  },
};

const pageSchema = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Theta PM Project Timeline Software",
    applicationCategory: "ProjectManagementApplication",
    operatingSystem: "Web",
    description: "Project timelines with milestones, drag-and-drop scheduling, and real-time updates.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  },
];

export default function TimelineFeature() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Features", "Timeline"]}
        title="Project Timeline Software That Stays Honest (2026)"
        intro={[
          "A project timeline answers the oldest question in project management: what is happening, and when? It lines up every task and milestone against the calendar so the whole project fits on one screen.",
          "Theta PM's timeline view does that with live tasks — drag to reschedule, set milestones, and watch the same dates appear on your board, Gantt, and calendar. The plan and the work never split into two versions of the truth.",
        ]}
        sections={[
          {
            h2: "The Whole Project on One Line",
            paragraphs: [
              "A timeline turns a project into a single horizontal picture: tasks placed by date, milestones marked as checkpoints, and gaps and overlaps visible at a glance.",
            ],
            bullets: [
              "Tasks positioned by their start and end dates.",
              "Milestones marking major checkpoints on the line.",
              "Overlaps and gaps that surface scheduling conflicts early.",
            ],
            screenshot: "Screenshot: Theta PM timeline view with milestones and task bars.",
          },
          {
            h2: "Milestones That Give the Project Shape",
            paragraphs: [
              "Milestones turn a flat list of tasks into a story: design done, build started, launch. Marking the few dates that genuinely matter keeps the team aligned on what the project is really driving toward.",
              "Milestones are not just decoration — they give leadership and clients a short list of dates to care about instead of a wall of tasks.",
            ],
          },
          {
            h2: "Drag-and-Drop Scheduling",
            paragraphs: [
              "Plans change, and a timeline should make changing them trivial. Drag a task to a new date and the timeline updates instantly — and because the timeline reads from the same tasks as the board, the board sees the new dates too.",
            ],
          },
          {
            h2: "Plan in Timeline, Execute on the Board",
            paragraphs: [
              "The timeline is where projects make sense; the board is where work gets done. In Theta PM they are the same tasks. Reschedule on the timeline, move cards on the board, and every view stays in sync in real time — no duplicate data entry, no drift.",
            ],
          },
          {
            h2: "Timeline vs Gantt vs Calendar",
            paragraphs: [
              "These three views answer different questions, and Theta PM includes all of them.",
            ],
            h3s: [
              {
                heading: "Timeline",
                body: "Tasks and milestones in sequence — the fastest way to see the shape of the project.",
              },
              {
                heading: "Gantt",
                body: "Adds duration bars and dependency links — for sequencing and 'what happens if this slips'.",
              },
              {
                heading: "Calendar",
                body: "Due dates on the team's familiar monthly view — for day-to-day date awareness.",
              },
            ],
            screenshot: "Screenshot: Theta PM Gantt view with dependency links next to the same project's timeline.",
          },
          {
            h2: "When a Timeline Pays for Itself",
            h3s: [
              {
                heading: "Multiple workstreams",
                body: "Several teams or streams feeding one deadline — the timeline shows the whole picture.",
              },
              {
                heading: "Fixed dates",
                body: "Launch dates, contract deadlines, or seasons — the timeline shows what must land before each one.",
              },
              {
                heading: "Stakeholder updates",
                body: "One clean line answers 'where are we and what is next' for leadership and clients.",
              },
            ],
          },
        ]}
        faqs={[
          {
            q: "What is project timeline software used for?",
            a: "It lines up every task and milestone against the calendar, so the whole project fits on one screen. Teams use it to plan sequences, spot conflicts, and answer 'what is happening and when'.",
          },
          {
            q: "Does Theta PM have a free timeline?",
            a: "Yes. The timeline view with milestones is included in Theta PM's free tier, along with board, Gantt, and calendar views.",
          },
          {
            q: "Can I reschedule tasks on the timeline?",
            a: "Yes. Drag tasks to new dates and the timeline updates instantly — the board, Gantt, and calendar see the same changes, since they all read from the same tasks.",
          },
          {
            q: "What is the difference between a timeline and a Gantt chart?",
            a: "A timeline shows tasks and milestones in sequence. A Gantt chart adds duration bars and dependency links, making it better for complex sequencing. Theta PM includes both.",
          },
          {
            q: "Does the timeline stay in sync with my kanban board?",
            a: "Yes. Both views read from the same tasks. Move a card on the board or reschedule on the timeline, and every view reflects it in real time.",
          },
        ]}
        internalLinks={[
          { label: "Gantt Chart Software", href: "/features/gantt" },
          { label: "Project Planning Software", href: "/features/project-planning" },
          { label: "Kanban Board Software", href: "/features/kanban-board" },
          { label: "What is a Gantt Chart", href: "/guides/what-is-a-gantt-chart" },
        ]}
        schema={pageSchema}
      />
    </SeoShell>
  );
}
