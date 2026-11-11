import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Agile Methodology: Frameworks, Ceremonies, and How to Choose",
  description:
    "A practical guide to agile methodology: the four values in real teams, how Scrum, Kanban, XP, and Lean differ, which ceremonies matter, and how to start.",
  path: "/guides/agile-methodology-guide",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Guides", "Agile Methodology Guide"]}
        title="Agile Methodology: A Practical Guide"
        intro={[
          "Agile is not a process you install. It is a set of commitments about how work gets decided: deliver in small increments, keep the plan adjustable, and let the people doing the work influence what happens next.",
          "That is easy to agree with and hard to practise. Most teams that say they are agile are running one of a handful of frameworks — Scrum, Kanban, XP, Lean — with varying fidelity. Knowing which one you are actually running is the difference between improving it and arguing about it.",
        ]}
        sections={[
          {
            h2: "The Four Values, Translated Into Behaviour",
            paragraphs: [
              "The values in the Agile Manifesto are deliberately abstract. Made concrete, they describe observable behaviour rather than intentions.",
            ],
            bullets: [
              "Individuals and interactions over processes and tools: the board is a tool; the conversation that resolves a blocker is the work.",
              "Working software over comprehensive documentation: a shipped increment answers more questions than a specification.",
              "Customer collaboration over contract negotiation: feedback during the work, not a change request after it.",
              "Responding to change over following a plan: the plan is a hypothesis that gets revised, not a contract.",
            ],
          },
          {
            h2: "Frameworks Compared",
            paragraphs: [
              "The frameworks differ mainly in what they fix and what they leave open. Scrum fixes roles, events, and artefacts. Kanban fixes nothing but the flow and the limits. That single distinction explains most of the friction when a team switches.",
            ],
            table: {
              headers: ["Framework", "Cadence", "Best fit", "Main cost"],
              rows: [
                ["Scrum", "Fixed sprints, usually two weeks", "Product work with a clear backlog and a product owner", "Ceremony overhead if the team is small or support-heavy"],
                ["Kanban", "Continuous flow", "Support, operations, and interrupt-driven work", "Needs discipline on WIP limits to be useful"],
                ["XP", "Short cycles with engineering practices", "Teams that can adopt test-first and pairing", "Requires engineering buy-in, not just process change"],
                ["Lean", "Flow with waste reduction", "Process improvement across a value stream", "Abstract for teams new to agile"],
                ["SAFe", "Program increments across many teams", "Large organisations coordinating many teams", "Heavy; often overkill below a few hundred people"],
              ],
            },
          },
          {
            h2: "The Ceremonies That Earn Their Time",
            paragraphs: [
              "Ceremonies are not the point of agile, but a few of them do real work. Keep the ones that change a decision and drop the ones that only report status.",
            ],
            h3s: [
              {
                heading: "Planning",
                body: "Worth it when it produces a commitment and surfaces dependencies. Not worth it when it is an estimate auction.",
              },
              {
                heading: "Daily sync",
                body: "Worth it at fifteen minutes focused on blockers and flow. Not worth it as a round-robin status report to a manager.",
              },
              {
                heading: "Review",
                body: "Worth it when real stakeholders see real work and give real feedback. Not worth it as a demo for people who already know.",
              },
              {
                heading: "Retrospective",
                body: "Worth it when one improvement is chosen and actually changes something before the next one.",
              },
            ],
          },
          {
            h2: "Why Agile Transformations Stall",
            paragraphs: [
              "The failure pattern is consistent: the ceremonies arrive, the authority does not. A team cannot self-organise if every priority is set elsewhere, and a retrospective cannot improve anything if its actions are never resourced.",
            ],
            bullets: [
              "Sprints are adopted but scope still changes mid-sprint without trade-offs.",
              "Estimates become commitments, which turns planning into negotiation.",
              "The board is updated for reporting rather than for the team's own use.",
              "Nobody owns the backlog, so the team is never sure what matters most.",
              "Retro actions accumulate and are never closed, so the team stops raising issues.",
            ],
          },
          {
            h2: "How to Start Without a Rebrand",
            paragraphs: [
              "You do not need a transformation programme. Pick a team, make the work visible, and change one thing at a time.",
            ],
            bullets: [
              "Put the actual work on a board with real statuses, and keep it current for a month.",
              "Introduce work-in-progress limits before introducing sprints — flow problems show up immediately.",
              "Hold a retrospective that ends with exactly one change and a named owner.",
              "Measure one thing: cycle time from started to done. It tells you more than velocity.",
            ],
          },
        ]}
        faqs={[
          {
            q: "What is agile methodology in simple terms?",
            a: "It is a way of managing work in small increments with a plan that is expected to change. Teams take a small batch of work, finish it, get feedback, and adjust before choosing the next batch.",
          },
          {
            q: "What is the difference between agile and Scrum?",
            a: "Agile is the set of values and principles. Scrum is one framework that implements them with fixed sprints, defined roles, and specific ceremonies. Kanban is another framework implementing the same values with continuous flow.",
          },
          {
            q: "Is Kanban an agile methodology?",
            a: "Yes. Kanban is an agile framework built around continuous flow and limiting work in progress, rather than fixed-length sprints. It suits interrupt-driven work where a sprint commitment does not hold.",
          },
          {
            q: "Do we need sprints to be agile?",
            a: "No. Sprints are a Scrum mechanism. A team using continuous flow with WIP limits and frequent delivery is working agilely without them.",
          },
          {
            q: "How long does an agile adoption take?",
            a: "The mechanics take weeks; the behaviour takes months. Expect the first honest retrospective after a few cycles, once the team trusts that raising a problem will change something.",
          },
        ]}
        internalLinks={[
          { label: "What is Agile", href: "/guides/what-is-agile" },
          { label: "What is a Sprint", href: "/guides/what-is-a-sprint" },
          { label: "Kanban vs Scrum", href: "/guides/kanban-vs-scrum" },
          { label: "Scrum vs Waterfall", href: "/guides/scrum-vs-waterfall" },
          { label: "Project Management Framework", href: "/guides/project-management-framework" },
          { label: "Kanban Guide", href: "/guides/kanban" },
        ]}
      />
    </SeoShell>
  );
}
