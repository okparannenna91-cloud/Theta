import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "How to Choose Project Management Software (2026 Guide)",
  description:
    "A buying process for project management software: define the workflow first, compare pricing models honestly, run a real pilot, and price the migration.",
  path: "/guides/how-to-choose-project-management-software",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Guides", "How to Choose PM Software"]}
        title="How to Choose Project Management Software"
        intro={[
          "Most software decisions fail before the demo. The requirements are written as a feature list, every tool on the market claims every item, and the choice comes down to which interface the most senior person in the room liked.",
          "A better process starts from the work: how your team actually moves a task from idea to done, and where that flow breaks today. Features then become a test of fit rather than a checklist.",
        ]}
        sections={[
          {
            h2: "Step 1: Describe Your Workflow Before You Look at Tools",
            paragraphs: [
              "Write down the states a piece of work passes through in your team, who touches it at each state, and what 'done' means. This is the single most useful artifact in the entire buying process, because every tool will be evaluated against it.",
            ],
            bullets: [
              "List the real statuses, not the ideal ones — if work sits in review for a week, that is a status.",
              "Note where handoffs happen between people or teams; those are the places tools usually fail.",
              "Write down what 'done' means for a task and for a project separately.",
              "Identify the two or three things that break most often today: that is your requirement list.",
            ],
          },
          {
            h2: "Step 2: Turn Pain Into Requirements",
            paragraphs: [
              "Requirements should be traceable to a problem. 'Needs Gantt charts' is not a requirement; 'we miss launch dates because dependencies are invisible' is, and it tells you what to test.",
            ],
            table: {
              headers: ["Symptom", "Real requirement", "What to test in the trial"],
              rows: [
                ["Deadlines slip silently", "Visible schedule with dependencies", "Add a dependency and move the predecessor"],
                ["Work disappears after handoff", "Status history per task", "Trace a task across three owners"],
                ["Nobody knows who is overloaded", "Workload by person", "Compare assigned work across the team"],
                ["Reports take a day to build", "Reporting from live task data", "Change a task and refresh the report"],
                ["Per-seat cost grows with guests", "Pricing that fits occasional users", "Price your real headcount, not the pilot group"],
              ],
            },
          },
          {
            h2: "Step 3: Compare Pricing Models, Not Price Tags",
            paragraphs: [
              "Project tools are priced in incompatible ways, which makes headline numbers useless. Normalise every option to the same question: what does this cost per year for our actual team, including the people who only need to read?",
            ],
            h3s: [
              {
                heading: "Per-seat with a base fee",
                body: "Cheap for small teams, grows linearly. Watch for a minimum seat count and for whether viewers need paid seats.",
              },
              {
                heading: "Flat rate for unlimited users",
                body: "Excellent at high headcount with simple needs, expensive for a five-person team, and often limited on planning features.",
              },
              {
                heading: "Feature-tiered seats",
                body: "The planning features you need are usually in a higher tier than the collaboration ones, so the effective price is the tier, not the entry price.",
              },
              {
                heading: "Usage-based add-ons",
                body: "AI credits, automation runs, and API calls can move the annual cost well beyond the subscription.",
              },
            ],
          },
          {
            h2: "Step 4: Run a Pilot on Real Work",
            paragraphs: [
              "A demo shows the tool at its best. A pilot shows it on your worst project. Pick one active project with a real deadline — not a sandbox — and run it for two to three weeks.",
            ],
            bullets: [
              "Include the least enthusiastic person on the team; their feedback predicts adoption.",
              "Load the messy data: half-finished tasks, a blocked dependency, a deadline that already moved.",
              "Check whether the tool made the weekly review shorter or longer.",
              "Ask what people did outside the tool during the pilot — that work is the gap.",
            ],
          },
          {
            h2: "Step 5: Price the Migration and the Exit",
            paragraphs: [
              "The cheapest subscription can be the most expensive purchase. Ask what importing existing projects costs in effort, and whether you can get your data out in a usable format if you leave.",
            ],
            table: {
              headers: ["Question", "Why it matters"],
              rows: [
                ["Can we import projects and tasks?", "Re-keying a year of history is a hidden cost"],
                ["Can we export everything to CSV?", "Exit cost is a negotiating position"],
                ["Does the import preserve dates and owners?", "Structure without dates means rebuilding the schedule"],
                ["Are integrations available for our repo and chat?", "Otherwise someone becomes a human API"],
              ],
            },
          },
          {
            h2: "Step 6: Decide Against Your Own Criteria",
            paragraphs: [
              "Write the decision down before the vendor conversation: the three requirements that are non-negotiable, the annual budget, and the migration effort you will accept. Then score the finalists against that, not against the demo.",
            ],
            bullets: [
              "If two tools tie, choose the one the team will actually update daily.",
              "Do not buy for a feature you plan to adopt 'later' — you will not.",
              "Pick a start date and retire the old tool; parallel running for months is how migrations fail.",
            ],
          },
        ]}
        faqs={[
          {
            q: "How do I choose project management software for a small team?",
            a: "Start from your real workflow and two or three concrete problems, then price the options for your actual headcount including occasional users. A free tier you can run a real project on is worth more than a long trial of an expensive tier.",
          },
          {
            q: "Is per-seat or flat-rate pricing better?",
            a: "It depends on headcount and how many people only need to read. Per-seat pricing with a low base fee wins for small, focused teams; flat-rate unlimited pricing wins at high headcount when the planning needs are modest.",
          },
          {
            q: "How long should a pilot last?",
            a: "Two to three weeks on one active project with a real deadline. Long enough to hit a weekly review and a handoff, short enough to keep the team engaged.",
          },
          {
            q: "What should I check before signing up?",
            a: "Import support for your existing projects, CSV export, whether dates and owners survive an import, and integrations for the tools your team already uses daily.",
          },
          {
            q: "How do I get the team to actually adopt it?",
            a: "Run the pilot with the least enthusiastic person included, keep the number of required fields small, and make the weekly review run out of the tool so using it saves time rather than adding a step.",
          },
        ]}
        internalLinks={[
          { label: "Best Project Management Software 2026", href: "/project-management-software" },
          { label: "Free vs Pro", href: "/pricing/free-vs-pro" },
          { label: "Theta vs ClickUp", href: "/project-management-software/theta-vs-clickup" },
          { label: "Theta vs Asana", href: "/project-management-software/theta-vs-asana" },
          { label: "Productivity Tools for Teams", href: "/guides/productivity-tools-for-teams" },
          { label: "Pricing", href: "/pricing" },
        ]}
      />
    </SeoShell>
  );
}
