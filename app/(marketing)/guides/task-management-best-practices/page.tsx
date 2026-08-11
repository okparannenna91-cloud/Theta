import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";

const BASE = "https://thetapm.site";

export const metadata: Metadata = {
  title: "Task Management Best Practices for Teams (2026)",
  description: "Task management best practices that actually work in 2026: write clear tasks, assign one owner, set real deadlines, and keep work visible.",
  alternates: { canonical: `${BASE}/guides/task-management-best-practices` },
  openGraph: {
    title: "Task Management Best Practices for Teams (2026)",
    description: "Clarity, ownership, deadlines, and visibility — the four habits that keep task tracking healthy.",
    url: `${BASE}/guides/task-management-best-practices`,
    siteName: "Theta PM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Task Management Best Practices for Teams (2026)",
    description: "The four habits that keep task tracking healthy — clarity, ownership, deadlines, visibility.",
    creator: "@theta_pm",
  },
};

const pageSchema = [
  {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Task Management Best Practices for Teams (2026)",
    description: "A practical guide to task management best practices: writing clear tasks, assigning one owner, setting deadlines, and keeping work visible with the right tools.",
    author: { "@type": "Organization", name: "Theta PM Systems" },
    publisher: { "@type": "Organization", name: "Theta PM Systems" },
  },
];

export default function TaskManagementBestPractices() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Guides", "Task Management Best Practices"]}
        title="Task Management Best Practices for Teams"
        intro={[
          "Teams rarely fail because people are lazy. They fail because tasks are vague, have no clear owner, or sit invisible until the deadline surprises everyone.",
          "Task management best practices fix that. This guide covers the four habits that keep task tracking healthy — clarity, ownership, deadlines, and visibility — plus how to write tasks people can actually finish.",
        ]}
        sections={[
          {
            h2: "Why Task Management Breaks Down",
            paragraphs: [
              "Before fixing task management, it helps to name the usual failure points. Most breakdowns look like one of these:",
            ],
            bullets: [
              "Vague tasks — 'look into the thing' means ten different things to ten people.",
              "No single owner, so everyone assumes someone else is doing it.",
              "No deadlines, so low-priority work quietly never happens.",
              "Invisible work — status lives in chat messages and memory instead of one place.",
              "Too much in progress at once, so nothing actually finishes.",
            ],
          },
          {
            h2: "The Four Core Practices That Matter Most",
            paragraphs: [
              "Every good task system comes back to the same four practices. Master these and most problems solve themselves.",
            ],
            h3s: [
              {
                heading: "Clarity",
                body: "A task should be readable in five seconds. Anyone who opens it should know exactly what done looks like. If a task needs a meeting to explain, it is not written well.",
              },
              {
                heading: "Ownership",
                body: "Every task gets one assignee. That person is accountable for the result. Collaborators can help, but one name owns the outcome — 'who is on this?' is never a question again.",
              },
              {
                heading: "Deadlines",
                body: "A task without a date will always wait. Real deadlines create rhythm, let the team plan, and surface conflicts early instead of on the due date.",
              },
              {
                heading: "Visibility",
                body: "Work should be visible to everyone who needs it, in one shared place. When anyone can see the board, no one has to ask for an update.",
              },
            ],
          },
          {
            h2: "Write Tasks That Work",
            paragraphs: [
              "The quality of a task decides the quality of the work. Use a simple structure so every task is complete before it is assigned.",
            ],
            bullets: [
              "Use a verb and a result — 'Draft the Q3 launch email' beats 'Email stuff'.",
              "Add the why in one line, so the person knows what the task is for.",
              "List the definition of done — the checkable things that mean the task is finished.",
              "Attach links and files directly to the task, not in chat.",
              "Add a custom field for things like effort, category, or client — whatever the team sorts and filters on.",
              "Split anything that takes more than a couple of days into smaller steps.",
            ],
            screenshot: "Screenshot: A well-structured task with a clear title, assignee, due date, and checklist of done criteria.",
          },
          {
            h2: "One Owner, One Deadline",
            paragraphs: [
              "Assign exactly one person and one due date to every task. This sounds obvious, and it is the single most skipped practice in real teams.",
              "When you assign a task in Theta PM, the assignee is notified through the inbox, so ownership is not just a name in a field — it is an active, visible commitment.",
            ],
            bullets: [
              "One assignee — collaborators are optional, but the owner is not.",
              "One due date — if a task needs two deadlines, split it into two tasks.",
              "Mention people in comments when they need to chime in, instead of assigning a task to five people.",
              "Reassign quickly when someone is overloaded, before the task goes stale.",
            ],
          },
          {
            h2: "Make Work Visible",
            paragraphs: [
              "Hidden work is the root of most 'I thought someone else was handling it' moments. Put every task on a shared board where the whole team can see the flow.",
            ],
            h3s: [
              {
                heading: "Keep a kanban board for daily flow",
                body: "Columns for each stage — To Do, In Progress, Done — show where work is and where it is stuck. Limit how many tasks sit in progress so work actually finishes.",
              },
              {
                heading: "Use the project overview for the big picture",
                body: "A board shows the day; the project overview shows the week and the month. Keep milestones and timelines there so leadership sees the plan without digging into cards.",
              },
            ],
            screenshot: "Screenshot: A shared kanban board with clear columns and the project overview showing milestones on the timeline.",
          },
          {
            h2: "Track What Matters With Custom Fields",
            paragraphs: [
              "Default fields — assignee, due date, status — cover the basics. The teams that track well add the few custom fields they actually filter on.",
            ],
            bullets: [
              "Effort or estimate, so planning and capacity talk is grounded in numbers.",
              "Category, client, or initiative, so reports and portfolio views answer real questions.",
              "Priority, so the board sorts itself without anyone policing it.",
              "A link field for related tickets, repos, or documents.",
            ],
          },
          {
            h2: "Build a Review Cadence That Sticks",
            paragraphs: [
              "The best practices only work if someone checks on them. A light, regular review keeps tasks from going stale.",
            ],
            table: {
              headers: ["Cadence", "Who", "What to check"],
              rows: [
                ["Daily standup", "The working team", "What is in progress, what is blocked, what ships today"],
                ["Weekly review", "Team lead or PM", "Priorities still correct, owners assigned, dates realistic"],
                ["Monthly cleanup", "Everyone", "Stale tasks closed or rescheduled, custom fields tidy, WIP limits honored"],
              ],
            },
          },
          {
            h2: "Pick Tools That Encourage Good Habits",
            paragraphs: [
              "The best task management software makes the right behavior the easy behavior. If the tool fights your process, the process loses.",
              "Theta PM keeps tasks, custom fields, kanban boards, timelines, and calendars in one place with real-time updates — so clarity, ownership, deadlines, and visibility all live where the work happens, and notifications through the inbox keep everyone in the loop.",
            ],
          },
        ]}
        faqs={[
          {
            q: "What is the most important task management best practice?",
            a: "Give every task one owner, one deadline, and a clear definition of done. Most task management problems — missed work, 'I thought you had it', stale tasks — trace back to one of those three being missing.",
          },
          {
            q: "What makes a well-written task?",
            a: "A well-written task has a verb and a result, a one-line reason, an owner, a due date, and a definition of done. If someone can read it in five seconds and start working, it is written well.",
          },
          {
            q: "Who should be assigned to a task?",
            a: "One person. Assign a single owner who is accountable for the result. Add collaborators if others help, but a task with five assignees usually has zero owners.",
          },
          {
            q: "How often should a team review its tasks?",
            a: "Daily for the working team and weekly for the lead. A daily standup clears blockers, and a weekly review keeps priorities, owners, and dates honest. Monthly, do a cleanup of stale tasks.",
          },
          {
            q: "What is the difference between task management and project management?",
            a: "Task management is about individual tasks — writing them, assigning them, and tracking them to done. Project management adds planning and coordination: timelines, dependencies, milestones, and portfolios. A good platform does both in one place.",
          },
        ]}
        internalLinks={[
          { label: "Task Management Software", href: "/features/tasks" },
          { label: "How to Prioritize Tasks", href: "/guides/how-to-prioritize-tasks" },
          { label: "Task Dependencies", href: "/guides/task-dependencies" },
          { label: "Custom Fields for Tasks", href: "/features/custom-fields" },
        ]}
        schema={pageSchema}
      />
    </SeoShell>
  );
}
