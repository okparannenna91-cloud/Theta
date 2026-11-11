import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Project Reports & Dashboards for Delivery Teams",
  description:
    "Project reports that answer status, workload, and delivery questions in one view. See what Theta PM reports on, how scheduled reports work, and how to export them.",
  path: "/features/reports",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Features", "Reports"]}
        title="Project Reports and Dashboards"
        intro={[
          "Most status reporting is archaeology. Someone opens five projects, counts cards, copies numbers into a slide, and presents a picture that was already out of date when the meeting started. The reporting problem is rarely a lack of data — it is that the data has to be assembled by hand.",
          "Theta PM reports from the tasks your team already updates. Status, completion, workload, and overdue work come from the same records people interact with every day, so the report reflects the workspace rather than a reconstruction of it.",
        ]}
        sections={[
          {
            h2: "The Questions Reports Should Answer",
            paragraphs: [
              "A useful project report answers a small number of concrete questions. If a dashboard cannot do that, it is decoration.",
            ],
            bullets: [
              "Are we on track? Completion against plan, with overdue work called out separately.",
              "Where is the work sitting? Task distribution by status, so bottlenecks are visible instead of inferred.",
              "Who is overloaded? Work assigned per person, so capacity problems surface before a deadline is missed.",
              "What changed since last week? Movement between statuses, not just a snapshot.",
              "What is at risk? Overdue and blocked tasks, with owners attached so follow-up is possible.",
            ],
          },
          {
            h2: "Dashboards Built From Live Task Data",
            paragraphs: [
              "Dashboards read directly from tasks, projects, and members. There is no separate reporting database to reconcile and no copy step that can drift — when a task moves, the numbers move with it.",
              "Because the dashboard reads the same records as the board, a project manager and an executive looking at the same workspace are looking at the same numbers. That single source of truth removes the most common reporting argument: whose spreadsheet is correct.",
            ],
          },
          {
            h2: "Scheduled Reports Instead of Report Requests",
            paragraphs: [
              "Recurring reporting is the easiest part of a project to forget and the most visible when it slips. Theta PM schedules reports so the weekly summary is produced by the workspace rather than remembered by a person.",
            ],
            bullets: [
              "Report schedules survive holidays, launches, and staff changes.",
              "The same definitions are used every period, so week-over-week comparisons mean something.",
              "Recipients get a consistent format instead of a different slide deck each time.",
            ],
          },
          {
            h2: "Exports for the Rest of the Business",
            paragraphs: [
              "Reports have to leave the tool sometimes — into a board pack, a client update, or a finance model. Task and project data exports to CSV for analysis, and Pro adds PDF export so a finished report can be shared without reformatting.",
            ],
            table: {
              headers: ["", "Free", "Growth", "Pro", "Theta Plus"],
              rows: [
                ["Data export (CSV)", "—", "Included", "Included", "Included"],
                ["PDF export", "—", "—", "Included", "Included"],
                ["Advanced analytics", "—", "—", "Included", "Included"],
              ],
            },
          },
          {
            h2: "Reporting Without a Data Team",
            paragraphs: [
              "The trap with analytics features is that they require a data team to be useful: someone has to build the chart, define the metric, and maintain it. Theta PM's reporting starts from a small set of delivery questions so a project lead can get an answer without commissioning work.",
            ],
            bullets: [
              "Start with three numbers: completion rate, overdue count, and work in progress per person.",
              "Add detail only when a number raises a question — not because a chart is available.",
              "Review on a fixed cadence so the report drives a decision rather than documenting one.",
            ],
          },
        ]}
        faqs={[
          {
            q: "What can I report on in Theta PM?",
            a: "Project and task status, completion, workload by assignee, overdue work, and progress across projects. Reports read directly from the tasks and projects in your workspace rather than from a separate copy of the data.",
          },
          {
            q: "Can I schedule reports to be sent automatically?",
            a: "Yes. Reports can be scheduled, so recurring summaries are produced by the workspace instead of being assembled by hand each period.",
          },
          {
            q: "How do I export a report?",
            a: "Task and project data export to CSV for spreadsheet or BI analysis. PDF export is available on Pro and above, which is useful when a report needs to go into a board pack or client update.",
          },
          {
            q: "Do reports stay in sync with the board?",
            a: "Yes. Dashboards and reports read the same task records the team updates, so moving a task changes the numbers. There is no second reporting dataset to reconcile.",
          },
          {
            q: "Which plan includes advanced analytics?",
            a: "Advanced analytics are part of Pro and Theta Plus. Growth includes core project tracking and CSV export. The pricing page has the full per-tier comparison.",
          },
        ]}
        internalLinks={[
          { label: "Portfolio Management", href: "/features/portfolio" },
          { label: "Task Management Software", href: "/features/tasks" },
          { label: "Timeline View", href: "/features/timeline" },
          { label: "Project Planning Software", href: "/features/project-planning" },
          { label: "Free vs Pro", href: "/pricing/free-vs-pro" },
          { label: "Pricing", href: "/pricing" },
        ]}
      />
    </SeoShell>
  );
}
