import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Portfolio Management: See Every Project in One View",
  description:
    "Portfolio management for teams running many projects at once. Compare project health, priorities, and progress in one view instead of opening each project.",
  path: "/features/portfolio",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Features", "Portfolio"]}
        title="Portfolio Management Across Projects"
        intro={[
          "A single project can be managed from a board. Ten projects cannot. Once a team is running several workstreams at once, the question stops being 'what is the status of this project?' and becomes 'which projects need attention this week, and what are we not doing because of them?'",
          "Theta PM's portfolio view answers that from the projects you already have. No separate portfolio tool, no consolidation spreadsheet, no re-keying status into a slide.",
        ]}
        sections={[
          {
            h2: "What a Portfolio View Is For",
            paragraphs: [
              "A portfolio view is a comparison layer. It does not replace project detail — it tells you which projects deserve your attention, so you open the right one rather than all of them.",
            ],
            bullets: [
              "Compare progress across active projects side by side.",
              "See which projects are behind, blocked, or at risk in one pass.",
              "Track priority so the team knows what to protect when capacity tightens.",
              "Spot where work is concentrated before it becomes a bottleneck.",
              "Report upward from one view instead of assembling a status deck.",
            ],
          },
          {
            h2: "How Theta PM Builds the Portfolio",
            paragraphs: [
              "Every project in the workspace feeds the portfolio with its current state, progress, and priority. Because the view is generated from live project data rather than entered separately, it cannot quietly disagree with the projects it summarises.",
            ],
            table: {
              headers: ["Question", "Where the answer comes from"],
              rows: [
                ["Which projects are behind?", "Project progress against their task status"],
                ["What is the priority order?", "Project priority fields, set once and kept current"],
                ["Which project is blocked?", "Task status across each project"],
                ["Where is the team stretched?", "Work distribution across active projects"],
              ],
            },
          },
          {
            h2: "Portfolio, Timeline, and Reports Are Different Views",
            paragraphs: [
              "Teams often use these words interchangeably, and then buy three tools. In Theta PM they are three lenses on the same projects:",
            ],
            h3s: [
              {
                heading: "Portfolio",
                body: "Comparison across projects — which ones matter this week and which need intervention.",
              },
              {
                heading: "Timeline and Gantt",
                body: "Sequence within a project — what starts when, what depends on what, and what slips if a task slips.",
              },
              {
                heading: "Reports and dashboards",
                body: "Trends over time — completion, workload, and overdue work across the workspace.",
              },
            ],
          },
          {
            h2: "Running a Portfolio Review That Changes Something",
            paragraphs: [
              "A portfolio review is only worth the hour if it ends with a decision. The view supports a short, repeatable agenda:",
            ],
            bullets: [
              "Start with what is behind, not with what is on track — the second list will not change anything.",
              "For each project at risk, name the specific task or dependency causing it.",
              "Decide what moves: scope, date, or people. A review with no trade-off is a status meeting.",
              "Check that last week's decisions actually happened before adding new ones.",
            ],
          },
          {
            h2: "When You Do Not Need a Portfolio View",
            paragraphs: [
              "If your team runs one or two projects at a time, a portfolio view adds a layer without adding information — a board and a timeline are enough. Portfolio management earns its place when parallel projects start competing for the same people, which is exactly when a per-project view stops being able to answer the important question.",
            ],
          },
        ]}
        faqs={[
          {
            q: "What is portfolio management in project management?",
            a: "Portfolio management is the practice of managing a group of projects together rather than one at a time: comparing their health and priority, allocating shared people and budget, and deciding which work to start, pause, or stop.",
          },
          {
            q: "What is the difference between a project and a portfolio?",
            a: "A project is a single body of work with a goal and a finish line. A portfolio is the collection of projects a team or organisation is running, viewed together so trade-offs between them are visible.",
          },
          {
            q: "Do I need a separate portfolio tool?",
            a: "Not if your projects already live in one workspace. Theta PM generates the portfolio view from existing projects, so there is no second system to keep in sync and no consolidation spreadsheet.",
          },
          {
            q: "Does the portfolio view stay current?",
            a: "Yes. It reads live project and task state, so as tasks move the portfolio changes. There is no separate status field to update before a review.",
          },
          {
            q: "Who is a portfolio view for?",
            a: "Team leads, project managers, and operators responsible for several concurrent projects — and anyone who has to report upward on progress across more work than they can track in their head.",
          },
        ]}
        internalLinks={[
          { label: "Reports & Dashboards", href: "/features/reports" },
          { label: "Timeline View", href: "/features/timeline" },
          { label: "Gantt Chart Software", href: "/features/gantt" },
          { label: "Milestones", href: "/features/milestones" },
          { label: "Best Project Management Software 2026", href: "/project-management-software" },
          { label: "Pricing", href: "/pricing" },
        ]}
      />
    </SeoShell>
  );
}
