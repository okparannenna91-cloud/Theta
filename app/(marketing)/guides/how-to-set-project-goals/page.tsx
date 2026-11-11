import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "How to Set Project Goals That Actually Guide the Work",
  description:
    "Set project goals as outcomes with a measure and a date, then break them into milestones and tasks. Includes examples and a review cadence that keeps goals alive.",
  path: "/guides/how-to-set-project-goals",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Guides", "How to Set Project Goals"]}
        title="How to Set Project Goals"
        intro={[
          "Most project goals are either restatements of the work ('ship version 2.0') or wishes with no measure ('improve the experience'). Neither helps anyone decide what to do on a Tuesday.",
          "A goal earns its place by changing a decision. If nobody would do anything differently because of it, it is a slogan. The practical version has three parts: an outcome, a measure, and a date — plus a clear line down to the milestones and tasks underneath.",
        ]}
        sections={[
          {
            h2: "Outcome, Not Output",
            paragraphs: [
              "Outputs are things you ship. Outcomes are things that change because you shipped them. Both matter, but only outcomes tell you whether the project worked.",
            ],
            table: {
              headers: ["Output", "Outcome", "Measure"],
              rows: [
                ["Launch onboarding flow", "New users reach their first task unaided", "% completing setup in week one"],
                ["Rewrite the API", "Integrations stop timing out", "p95 latency, support tickets per week"],
                ["Ship reporting", "Leads review delivery without a manual deck", "Reports opened weekly"],
              ],
            },
          },
          {
            h2: "The Three Parts of a Usable Goal",
            paragraphs: [
              "A goal that survives contact with a busy quarter has a measure you can check and a date you can miss. Without both, it cannot fail — and a goal that cannot fail cannot guide anything.",
            ],
            bullets: [
              "Outcome: the change in the world, stated plainly.",
              "Measure: one number that moves if the outcome happens, with a baseline and target.",
              "Date: when you will judge it, not when it will feel finished.",
              "Owner: one person accountable for the goal, separate from the people doing the tasks.",
            ],
          },
          {
            h2: "From Goal to Milestone to Task",
            paragraphs: [
              "Goals fail when they float above the work. The chain that keeps them connected is short: a goal needs a small number of milestones, and each milestone needs linked tasks that constitute it.",
            ],
            bullets: [
              "One goal per project, at most two. More than that means the priorities are not decided.",
              "Three to five milestones, each a decision or a delivery rather than a percentage.",
              "Link the tasks that must finish for each milestone, so progress is derived rather than asserted.",
              "If a task cannot be traced to a milestone, ask why it is in the project.",
            ],
          },
          {
            h2: "Leading and Lagging Measures",
            paragraphs: [
              "Outcome measures are lagging: they tell you whether you succeeded, after the fact. That is too late to steer with. Pair each lagging measure with a leading one you can move this week.",
            ],
            table: {
              headers: ["Lagging (outcome)", "Leading (steering)"],
              rows: [
                ["Activation rate", "Setup completion within 24 hours"],
                ["Support tickets per week", "Known issue count in the backlog"],
                ["On-time delivery", "Milestones with slippage flagged more than a week early"],
              ],
            },
          },
          {
            h2: "Reviewing Goals Without Turning Them Into Status Meetings",
            paragraphs: [
              "Check goals on a fixed cadence — monthly is usually right — and ask three questions: is the measure moving, is the assumption still true, and what would we stop doing? That last question is the useful one, and it is the one most reviews skip.",
              "If a goal is no longer worth pursuing, say so explicitly and close it. A silently abandoned goal teaches the team that goals are decoration.",
            ],
          },
        ]}
        faqs={[
          {
            q: "What makes a good project goal?",
            a: "A specific outcome, one measure with a baseline and target, a date you will judge it by, and a single owner. If you could not tell whether it succeeded, it is not yet a goal.",
          },
          {
            q: "What is the difference between a goal and a milestone?",
            a: "A goal is the change you want and how you will measure it. A milestone is a checkpoint on the way there, with a date and linked tasks. Goals are judged; milestones are reached.",
          },
          {
            q: "How many goals should a project have?",
            a: "One, occasionally two. A project with five goals has no priority, and the team will optimise for the one their manager mentions most.",
          },
          {
            q: "Should goals be SMART?",
            a: "The useful parts of SMART are specific, measurable, and time-bound. The rest often produces goals that are achievable and irrelevant, so start from the outcome you actually need.",
          },
          {
            q: "What if a goal becomes irrelevant mid-project?",
            a: "Say so and close it with a note explaining why. Quietly abandoning a goal teaches the team that goals are for show, which is hard to reverse.",
          },
        ]}
        internalLinks={[
          { label: "Portfolio Management", href: "/features/portfolio" },
          { label: "Milestones", href: "/features/milestones" },
          { label: "How to Manage Project Risks", href: "/guides/how-to-manage-project-risks" },
          { label: "How to Prioritize Tasks", href: "/guides/how-to-prioritize-tasks" },
          { label: "Task Management Best Practices", href: "/guides/task-management-best-practices" },
          { label: "Project Planning Software", href: "/features/project-planning" },
        ]}
      />
    </SeoShell>
  );
}
