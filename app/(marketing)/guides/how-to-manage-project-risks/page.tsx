import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "How to Manage Project Risks: Register, Score, and Respond",
  description:
    "A practical risk management process: build a register, score likelihood and impact, choose a response, and review it on a cadence before risks become issues.",
  path: "/guides/how-to-manage-project-risks",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Guides", "How to Manage Project Risks"]}
        title="How to Manage Project Risks"
        intro={[
          "A risk is something that might happen. An issue is something that already did. Teams that skip risk management do not avoid risk — they just discover it later, when it has become an issue with a date attached.",
          "Managing risk is a small, repeatable loop: name what could go wrong, decide how much it would hurt, choose a response, and check again next week. It takes less time than the meeting you hold after something breaks.",
        ]}
        sections={[
          {
            h2: "Step 1: Build a Risk Register",
            paragraphs: [
              "The register is a table, not a document. Its purpose is to make risks visible and owned, so it should stay short enough that someone reads it every week.",
            ],
            bullets: [
              "Description: what could happen, written as a specific event rather than a category.",
              "Owner: one person who watches it. A risk with three owners has none.",
              "Likelihood and impact: a simple high/medium/low is enough for most projects.",
              "Response: what you are doing about it, or an explicit decision to accept it.",
              "Trigger: the early signal that it is happening, so you notice before the deadline.",
            ],
          },
          {
            h2: "Step 2: Score and Prioritise",
            paragraphs: [
              "Scoring exists to decide what to discuss, not to produce a precise number. Multiplying invented probabilities by invented costs mostly creates the illusion of rigour.",
            ],
            table: {
              headers: ["Likelihood", "Low impact", "Medium impact", "High impact"],
              rows: [
                ["High", "Monitor", "Mitigate", "Act now"],
                ["Medium", "Accept", "Mitigate", "Act now"],
                ["Low", "Accept", "Monitor", "Plan a contingency"],
              ],
            },
          },
          {
            h2: "Step 3: Pick a Response",
            paragraphs: [
              "There are only four honest responses to a risk. Naming which one you chose is what turns a worry into a plan.",
            ],
            h3s: [
              {
                heading: "Avoid",
                body: "Change the plan so the risk cannot happen — drop the dependency, move the launch, choose a simpler approach.",
              },
              {
                heading: "Mitigate",
                body: "Reduce likelihood or impact: add a review step, split a large migration, or run a spike before committing.",
              },
              {
                heading: "Transfer",
                body: "Move the consequence to someone else — a vendor contract, insurance, or an SLA. The work does not disappear, but the exposure does.",
              },
              {
                heading: "Accept",
                body: "Decide consciously to live with it, and write down why. Acceptance is a valid choice; unrecorded acceptance is just forgetting.",
              },
            ],
          },
          {
            h2: "Step 4: Watch Triggers, Not Just the Register",
            paragraphs: [
              "The register describes what might happen. Triggers tell you when it starts. A trigger should be something you can observe in the workspace — a task blocked for more than three days, a dependency with no owner, a milestone with no linked work in front of it.",
            ],
            bullets: [
              "Blocked tasks that stay blocked: usually an unowned external dependency.",
              "A milestone with no tasks before it: the date exists, the work does not.",
              "One person assigned to most of a critical path: a single point of failure.",
              "Estimates that keep moving in one direction: scope is expanding without being named.",
            ],
          },
          {
            h2: "Step 5: Review on a Cadence",
            paragraphs: [
              "Risk review belongs inside an existing meeting, not a new one. Ten minutes in the weekly delivery review, working down the register, is enough: what changed, what is now an issue, what new trigger appeared.",
              "The register should shrink as well as grow. A risk that has passed its window without occurring should be closed with a note, or it becomes background noise that trains the team to ignore the list.",
            ],
          },
        ]}
        faqs={[
          {
            q: "What is the difference between a risk and an issue?",
            a: "A risk might happen; an issue already has. Risks are tracked with likelihood and impact and managed with a response. Issues are problems to resolve now and are usually tracked as blocked or escalated work.",
          },
          {
            q: "What should a risk register contain?",
            a: "A specific description, a single owner, likelihood and impact, the chosen response, and a trigger that shows when the risk is materialising. Keep it short enough to review weekly.",
          },
          {
            q: "How many risks should I track?",
            a: "Usually five to fifteen for an active project. If the register is longer than anyone will read, it has become a documentation exercise rather than a decision tool.",
          },
          {
            q: "Is accepting a risk a valid response?",
            a: "Yes, provided the decision is recorded with its reasoning. Accepting a risk deliberately is management; accepting it by not thinking about it is how projects fail quietly.",
          },
          {
            q: "Who should own a risk?",
            a: "One person who is close enough to notice the trigger and senior enough to act. Shared ownership reliably results in nobody watching.",
          },
        ]}
        internalLinks={[
          { label: "Project Planning Software", href: "/features/project-planning" },
          { label: "Milestones", href: "/features/milestones" },
          { label: "Timeline View", href: "/features/timeline" },
          { label: "How to Prioritize Tasks", href: "/guides/how-to-prioritize-tasks" },
          { label: "How to Set Project Goals", href: "/guides/how-to-set-project-goals" },
          { label: "Project Management Framework", href: "/guides/project-management-framework" },
        ]}
      />
    </SeoShell>
  );
}
