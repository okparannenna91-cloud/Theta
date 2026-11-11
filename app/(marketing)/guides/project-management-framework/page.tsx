import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Project Management Frameworks Compared: Waterfall, Agile, Hybrid",
  description:
    "Compare project management frameworks — waterfall, agile, hybrid, critical path, and critical chain — and pick one based on uncertainty, not fashion.",
  path: "/guides/project-management-framework",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Guides", "Project Management Framework"]}
        title="Project Management Frameworks Compared"
        intro={[
          "A framework is a set of default decisions: how work is planned, how change is handled, and how progress is judged. Picking one is not a matter of maturity — it is a matter of how much you know at the start.",
          "When requirements are stable and the sequence is known, a plan-first framework works. When the destination is clear but the route is not, an iterative one does. Most real projects are a mix, which is why hybrid is common and rarely written down.",
        ]}
        sections={[
          {
            h2: "The Main Frameworks",
            paragraphs: [
              "These are the approaches most teams are actually choosing between, whatever the labels on their job descriptions say.",
            ],
            table: {
              headers: ["Framework", "Plan", "Change", "Best when"],
              rows: [
                ["Waterfall", "Fully up front", "Formal change control", "Requirements fixed, sequence known, regulated delivery"],
                ["Agile (Scrum/Kanban)", "Iterative, rolling", "Expected and cheap", "Destination clear, route uncertain"],
                ["Hybrid", "Stage gates with iterative inside", "Managed per stage", "Mixed portfolio: some fixed, some exploratory"],
                ["Critical path", "Scheduling method", "Re-baselines the path", "Complex dependencies and hard dates"],
                ["Critical chain", "Scheduling plus buffers", "Buffer consumption drives action", "Resource contention across projects"],
              ],
            },
          },
          {
            h2: "Choose by Uncertainty, Not by Fashion",
            paragraphs: [
              "Two questions settle most framework decisions. How much of the requirement is genuinely fixed? And how expensive is a change late in the project?",
            ],
            bullets: [
              "Fixed requirements, expensive change: waterfall or stage-gated hybrid. Iteration buys nothing if the spec cannot move.",
              "Uncertain requirements, cheap change: agile. Discovery is the work, so short cycles are the mechanism.",
              "Hard deadline with uncertain scope: fix the date and the team size, let scope flex. Most launch projects are this shape.",
              "Many interdependent projects sharing people: critical chain, or you will optimise each project into a bottleneck.",
            ],
          },
          {
            h2: "What Hybrid Actually Looks Like",
            paragraphs: [
              "Hybrid usually means a stage-gated outer structure with iterative delivery inside each stage: a fixed business case and a hard external date, but two-week cycles for the work in between. Done deliberately it gives predictability to stakeholders and flexibility to the team.",
              "Done accidentally it means two reporting systems and a permanent argument about which plan is real — which is the failure mode to watch for.",
            ],
            table: {
              headers: ["Element", "Deliberate hybrid", "Accidental hybrid"],
              rows: [
                ["Plan", "Stage gates plus rolling detail", "Gantt and backlog, never reconciled"],
                ["Status", "One system of record", "Two decks, two truths"],
                ["Change", "Handled at the gate", "Handled by whoever asks loudest"],
              ],
            },
          },
          {
            h2: "Frameworks Do Not Fix Ownership",
            paragraphs: [
              "The most common framework failure is not the framework. It is that nobody owns the plan, so decisions get made by whoever is most persistent. Any framework works with a named owner and a single source of truth; none works without them.",
            ],
            bullets: [
              "Name one person accountable for the plan and its trade-offs.",
              "Keep status in one place, whatever the framework.",
              "Make the change process explicit — even if the answer is 'the team decides within the cycle'.",
            ],
          },
          {
            h2: "A Practical Starting Point",
            paragraphs: [
              "If you are unsure, start with continuous flow and visible work: a board with real statuses, WIP limits, and a weekly review. That gives you a baseline for cycle time. Add stage gates if you have external commitments that need them; add sprints if the work benefits from batch commitment. frameworks are easier to add to a functioning flow than to bolt onto chaos.",
            ],
          },
        ]}
        faqs={[
          {
            q: "What is a project management framework?",
            a: "A framework is a predefined set of practices for planning, executing, and controlling a project — for example waterfall, agile, or hybrid. It sets defaults so the team does not renegotiate how work is managed on every project.",
          },
          {
            q: "Is agile always better than waterfall?",
            a: "No. Agile handles uncertainty well and fixed requirements poorly — if the specification genuinely cannot change, iteration adds overhead. Waterfall suits stable requirements with expensive late change.",
          },
          {
            q: "What is a hybrid project management framework?",
            a: "It combines a structured outer plan, often with stage gates and fixed dates, with iterative delivery inside each stage. It suits projects with hard external commitments but uncertain execution detail.",
          },
          {
            q: "What is critical chain versus critical path?",
            a: "Critical path is a scheduling method that identifies the longest dependent sequence. Critical chain adds resource contention and buffer management, so it accounts for the same people being needed on several projects.",
          },
          {
            q: "Does the framework change which tool I need?",
            a: "It changes which views matter. Waterfall and hybrid rely on Gantt charts and dependencies; agile relies on boards and flow metrics. Choose a tool that supports the views your framework needs on the same data.",
          },
        ]}
        internalLinks={[
          { label: "Agile Methodology Guide", href: "/guides/agile-methodology-guide" },
          { label: "Scrum vs Waterfall", href: "/guides/scrum-vs-waterfall" },
          { label: "Kanban vs Scrum", href: "/guides/kanban-vs-scrum" },
          { label: "Gantt Chart Software", href: "/features/gantt" },
          { label: "Project Planning Software", href: "/features/project-planning" },
          { label: "Timeline View", href: "/features/timeline" },
        ]}
      />
    </SeoShell>
  );
}
