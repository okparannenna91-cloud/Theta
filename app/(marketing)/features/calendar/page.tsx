import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Project Calendar: Deadlines and Tasks on One Schedule",
  description:
    "See every task deadline and project event on one calendar. Month, week, day, and agenda views over the same work your team tracks, with saved views per team.",
  path: "/features/calendar",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Features", "Calendar"]}
        title="Project Calendar for Deadlines and Delivery"
        intro={[
          "Dates are the part of a project that everyone agrees on and nobody looks at closely enough. A task without a date is a wish; a project where the dates live only inside individual task screens has no visible schedule at all.",
          "Theta PM's calendar puts dated work and project events on one surface. The same tasks that appear on the board and the timeline appear here against their due dates, so the calendar is a view of reality rather than a separate plan.",
        ]}
        sections={[
          {
            h2: "One Schedule, Four Ways to Read It",
            paragraphs: [
              "Different questions need different time horizons. The calendar offers the standard set, all reading from the same events and dated tasks.",
            ],
            h3s: [
              {
                heading: "Month",
                body: "The planning view — see how work is distributed across the next few weeks and where the heavy days are.",
              },
              {
                heading: "Week",
                body: "The working view — what is due in the current cycle and what the team is committing to this week.",
              },
              {
                heading: "Day",
                body: "The focus view — exactly what lands today, for the person who has to deliver it.",
              },
              {
                heading: "Agenda",
                body: "The list view — upcoming dated work in order, useful when you want the sequence rather than the grid.",
              },
            ],
          },
          {
            h2: "Tasks and Events in the Same Place",
            paragraphs: [
              "A project calendar has to hold two different kinds of thing: the work that is due, and the meetings or milestones around it. Theta PM shows dated tasks alongside calendar events, so a launch date and the tasks feeding it appear together — which is how you notice that three deliverables are scheduled for the same afternoon.",
            ],
            bullets: [
              "Tasks with due dates appear on their dates automatically, with project context.",
              "Project events and meetings sit alongside the work rather than in a separate app.",
              "Status and priority are visible on the entry, so the calendar is not just a list of titles.",
              "Overdue work stays visible instead of sliding quietly into the past.",
            ],
          },
          {
            h2: "Saved Views for Different Teams",
            paragraphs: [
              "One calendar cannot serve everyone. A designer needs their own deadlines; a delivery lead needs everything landing this week; a founder wants the client-facing dates. Saved calendar views let each of those exist without anyone rebuilding filters each morning.",
            ],
          },
          {
            h2: "Why a Calendar Beats a Deadline Column",
            paragraphs: [
              "A due-date column tells you when a task is supposed to finish. A calendar tells you what that means: how many things finish the same day, whether the last week of the sprint is empty or impossible, and whether the launch date actually has any work in front of it.",
            ],
            table: {
              headers: ["Question", "Due-date column", "Calendar view"],
              rows: [
                ["When is this task due?", "Yes", "Yes"],
                ["What else lands that day?", "No", "Yes"],
                ["Is the final week overloaded?", "Hard to see", "Visible"],
                ["Does the launch date have work before it?", "No", "Yes"],
              ],
            },
          },
          {
            h2: "Scheduling Without a Second System",
            paragraphs: [
              "The usual failure mode is a calendar that has to be maintained by hand, which means it is accurate for about two weeks. Because Theta PM's calendar reads task due dates, keeping it current is the same activity as doing the work — rescheduling a task in the board or the timeline moves it here too.",
            ],
          },
        ]}
        faqs={[
          {
            q: "What is a project calendar?",
            a: "A project calendar shows project work against time: tasks placed on their due dates alongside events and milestones. It is used to see what lands when, spot overloaded periods, and confirm that a deadline has work scheduled before it.",
          },
          {
            q: "Which calendar views are available?",
            a: "Month, week, day, and agenda views, plus saved views so teams can keep their own filters. All views read from the same tasks and events.",
          },
          {
            q: "Do tasks appear on the calendar automatically?",
            a: "Tasks with due dates appear on their dates without being added separately. Rescheduling a task updates the calendar, because the calendar reads task dates rather than holding its own copy.",
          },
          {
            q: "Can I see overdue work on the calendar?",
            a: "Yes. Overdue work remains visible on its original date so it cannot slip out of view, which is the failure mode of a calendar built from a manually curated list.",
          },
          {
            q: "Is the calendar separate from the board and timeline?",
            a: "No. The calendar, board, timeline, and Gantt chart are different views over the same tasks. Changing a task in one view is reflected in the others.",
          },
        ]}
        internalLinks={[
          { label: "Timeline View", href: "/features/timeline" },
          { label: "Milestones", href: "/features/milestones" },
          { label: "Gantt Chart Software", href: "/features/gantt" },
          { label: "Task Management Software", href: "/features/tasks" },
          { label: "Project Planning Software", href: "/features/project-planning" },
          { label: "Pricing", href: "/pricing" },
        ]}
      />
    </SeoShell>
  );
}
