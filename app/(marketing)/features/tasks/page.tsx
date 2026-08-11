import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";

const BASE = "https://thetapm.site";

export const metadata: Metadata = {
  title: "Task Management Software That Keeps Teams in Flow (2026)",
  description: "Task management software with assignees, custom fields, dependencies, multiple views, and real-time collaboration. Track work from idea to done in one place.",
  alternates: { canonical: `${BASE}/features/tasks` },
  openGraph: {
    title: "Task Management Software That Keeps Teams in Flow (2026)",
    description: "Assignees, custom fields, dependencies, multiple views, and real-time collaboration.",
    url: `${BASE}/features/tasks`,
    siteName: "Theta PM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Task Management Software That Keeps Teams in Flow (2026)",
    description: "Track work from idea to done in one place.",
    creator: "@theta_pm",
  },
};

const pageSchema = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Theta PM Task Management Software",
    applicationCategory: "ProjectManagementApplication",
    operatingSystem: "Web",
    description: "Task management with custom fields, dependencies, multiple views, and real-time collaboration.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  },
];

export default function TasksFeature() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Features", "Tasks"]}
        title="Task Management Software That Keeps Teams in Flow (2026)"
        intro={[
          "Most 'task management' starts and ends with a shared to-do list. That works until the team grows, projects overlap, and someone asks 'who owns this, when is it due, and what is blocking it?'",
          "Theta PM is task management built for teams: every task carries ownership, dates, custom fields, and dependencies — and it lives in a board, timeline, calendar, or Gantt view so everyone sees work the way they think about it.",
        ]}
        sections={[
          {
            h2: "Every Task, Fully Loaded",
            paragraphs: [
              "A task in Theta PM is not a one-line item. It is the home for everything about that piece of work.",
            ],
            bullets: [
              "Description and rich details attached to the work itself.",
              "Assignees — one clear owner, plus collaborators.",
              "Due dates, priorities, and progress status.",
              "Custom fields for whatever your team tracks — estimate, category, client, stage.",
              "Comments and mentions that keep discussion next to the work.",
              "Dependencies, so you can see what must finish before this can start.",
            ],
            screenshot: "Screenshot: Theta PM task with assignee, custom fields, and dependency links.",
          },
          {
            h2: "One Task, Many Views",
            paragraphs: [
              "The same tasks appear across multiple views — you are never maintaining two systems.",
            ],
            h3s: [
              {
                heading: "Board view",
                body: "Drag tasks between workflow columns and see where work is flowing.",
              },
              {
                heading: "Timeline view",
                body: "See tasks on a schedule with milestones, so leadership gets the roadmap.",
              },
              {
                heading: "Gantt view",
                body: "Visualize dependencies and the critical path for complex projects.",
              },
              {
                heading: "Calendar view",
                body: "See due dates and meetings together, perfect for marketing and ops teams.",
              },
            ],
          },
          {
            h2: "Assign Work Without Guesswork",
            paragraphs: [
              "Assign a task to one clear owner, add a due date, and the right people get notified automatically. No more 'who is on this?' messages in chat.",
              "When work is ready to move, automations reassign and notify automatically — so the handoff between team members is never missed.",
            ],
          },
          {
            h2: "Custom Fields for the Way Your Team Works",
            paragraphs: [
              "Off-the-shelf task fields never cover every team's needs. Custom fields let you add exactly the data you filter and sort on — client name, sprint number, effort estimate, content stage — and they appear on task cards and in task dialogs.",
            ],
          },
          {
            h2: "Task Dependencies",
            paragraphs: [
              "Some tasks cannot start until others finish. Dependencies make that explicit: the board and Gantt show what is blocked and what is blocking it, so a delay in one area shows its impact on the whole project immediately.",
            ],
          },
          {
            h2: "Real-Time, So the Status Is Always True",
            paragraphs: [
              "When someone moves a task or adds a comment, everyone sees it instantly. The activity feed gives you a living record of what changed, who changed it, and when — which replaces the 'can someone send me an update?' meetings.",
            ],
          },
        ]}
        faqs={[
          {
            q: "Is task management software the same as project management software?",
            a: "No. Task management handles individual tasks and to-dos. Project management adds planning — timelines, dependencies, milestones, and portfolios. Theta PM is a full project management platform that includes task management.",
          },
          {
            q: "Can I track tasks in more than one view?",
            a: "Yes. The same tasks appear on the kanban board, timeline, Gantt, and calendar views. Change one and every view updates.",
          },
          {
            q: "Can I add custom fields to tasks?",
            a: "Yes. Custom fields let you track anything your team needs, and they show up on task cards and in the task dialog.",
          },
          {
            q: "Can tasks depend on each other?",
            a: "Yes. Set dependencies between tasks and the timeline and Gantt will show which work is blocked and by what.",
          },
          {
            q: "Does Theta PM send task notifications?",
            a: "Yes. Assignments, mentions, and status changes notify the right people through the inbox, so nothing is missed.",
          },
        ]}
        internalLinks={[
          { label: "Kanban Board Software", href: "/features/kanban-board" },
          { label: "Team Collaboration Software", href: "/features/collaboration" },
          { label: "Jira Alternative", href: "/alternatives/jira-alternative" },
          { label: "Project Planning Software", href: "/features/project-planning" },
          { label: "Gantt Chart Software", href: "/features/gantt" },
          { label: "Best Project Management Software 2026", href: "/project-management-software" },
        ]}
        schema={pageSchema}
      />
    </SeoShell>
  );
}
