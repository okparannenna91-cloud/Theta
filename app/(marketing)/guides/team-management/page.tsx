import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Team Management: Roles, Capacity, and One-on-Ones",
  description:
    "Team management practices that hold up under delivery pressure: clear roles, honest capacity planning, useful one-on-ones, and delegation that transfers ownership.",
  path: "/guides/team-management",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Guides", "Team Management"]}
        title="Team Management That Survives Delivery Pressure"
        intro={[
          "Most team problems that look like motivation problems are actually clarity problems. People are not sure who decides, what 'done' means, or whether the deadline is real. The result looks like low engagement and is usually unresolved ambiguity.",
          "Managing a team is mostly the work of removing that ambiguity: naming owners, making capacity visible, and holding a regular conversation that is not about status.",
        ]}
        sections={[
          {
            h2: "Start With Roles, Not Titles",
            paragraphs: [
              "A title describes seniority. A role describes what someone decides. Teams get into trouble when the two are confused — a senior engineer who cannot approve a technical decision will escalate everything, and a junior who owns a workstream may not know they can.",
            ],
            bullets: [
              "Write down who decides what: scope, technical approach, quality bar, and priority.",
              "Name one accountable owner per workstream. Shared accountability reliably becomes none.",
              "Separate the person who does the work from the person who signs it off, and say so explicitly.",
              "Publish the roles where the work lives, not in a document nobody opens.",
            ],
          },
          {
            h2: "Make Capacity Visible Before You Plan",
            paragraphs: [
              "Capacity planning fails when it is done from memory. Three people at 80% are not 2.4 people of throughput if one of them is also handling support and another is interviewing.",
            ],
            table: {
              headers: ["Signal", "What it usually means"],
              rows: [
                ["One person on most of the critical path", "Single point of failure; unplanned absence stalls delivery"],
                ["Work in progress rising while throughput is flat", "Too much started, nothing finishing"],
                ["Same person in every review", "Review is a bottleneck, not a quality gate"],
                ["Estimates consistently optimistic", "Scope is being discovered during execution, not before"],
              ],
            },
          },
          {
            h2: "Run One-on-Ones That Are Not Status Meetings",
            paragraphs: [
              "Status belongs in the workspace where everyone can see it. A one-on-one spent reading updates aloud is a waste of the only private time a manager has.",
            ],
            bullets: [
              "Ask what is slowing them down, not what they finished.",
              "Ask what they would change about how the team works, and act on one answer.",
              "Raise the uncomfortable thing early; a problem discussed at month three is a resignation at month six.",
              "Keep notes and follow up — an action that never returns teaches people to stop raising issues.",
            ],
          },
          {
            h2: "Delegate Ownership, Not Tasks",
            paragraphs: [
              "Handing someone a task creates a queue. Handing someone a workstream creates a person who notices problems before you do. The difference is whether they can make decisions inside it.",
            ],
            h3s: [
              {
                heading: "Give a boundary",
                body: "State what they own, what they can decide alone, and what needs to come back to you. Ambiguity here produces either paralysis or escalation.",
              },
              {
                heading: "Give the context behind the goal",
                body: "People make better trade-offs when they know why the work matters, not just what it is.",
              },
              {
                heading: "Agree on the check-in cadence",
                body: "Weekly for a new owner, less as trust builds. Silence is not delegation; it is abdication with extra steps.",
              },
            ],
          },
          {
            h2: "Remote and Hybrid Teams Need Written Defaults",
            paragraphs: [
              "Co-located teams absorb process gaps through proximity. Distributed teams cannot, so the defaults have to be written: where decisions are recorded, what counts as an update, and when someone is expected to respond.",
            ],
            bullets: [
              "Decide in writing, in the place the work lives, so time zones do not lose the reasoning.",
              "Define response expectations by channel instead of leaving them to guesswork.",
              "Protect focus time explicitly; a calendar full of meetings is a capacity decision made by accident.",
              "Rotate meeting times if the team spans time zones, or accept that one group always pays.",
            ],
          },
          {
            h2: "The Manager's Real Deliverable",
            paragraphs: [
              "A team's output is a function of clarity, capacity, and trust. None of those are produced by more reporting. They come from naming owners, keeping the plan honest, and following through on the small commitments — which is why the least glamorous parts of team management are the ones that move delivery.",
            ],
          },
        ]}
        faqs={[
          {
            q: "What is the most important part of team management?",
            a: "Clarity: who decides what, what done means, and what the team is prioritising. Most motivation problems are unresolved ambiguity in disguise.",
          },
          {
            q: "How often should one-on-ones be?",
            a: "Weekly for most teams, thirty minutes, focused on blockers and growth rather than status. Status belongs in the workspace where the whole team can see it.",
          },
          {
            q: "How do I manage a remote team?",
            a: "Write the defaults down: where decisions are recorded, what counts as an update, and what response time is expected per channel. Proximity normally absorbs these gaps, so distributed teams have to make them explicit.",
          },
          {
            q: "How do I delegate without losing control?",
            a: "Give ownership of a bounded area, the context behind the goal, and an agreed check-in cadence. Delegating tasks creates a queue; delegating decisions creates an owner.",
          },
          {
            q: "How do I know if my team is overloaded?",
            a: "Look for rising work in progress with flat completion, one person on most of the critical path, and repeated slipping estimates. Those are capacity signals that show up before anyone says they are overloaded.",
          },
        ]}
        internalLinks={[
          { label: "Collaboration", href: "/features/collaboration" },
          { label: "Team Inbox", href: "/features/inbox" },
          { label: "Portfolio Management", href: "/features/portfolio" },
          { label: "Task Management Best Practices", href: "/guides/task-management-best-practices" },
          { label: "How to Prioritize Tasks", href: "/guides/how-to-prioritize-tasks" },
          { label: "Productivity Tools for Teams", href: "/guides/productivity-tools-for-teams" },
        ]}
      />
    </SeoShell>
  );
}
