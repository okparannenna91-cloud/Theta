import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Best Teamwork Alternatives in 2026 for Agencies",
  description:
    "Teamwork is built around client billing. Compare alternatives for agencies that need delivery tracking, time reporting, and client projects without per-seat billing weight.",
  path: "/alternatives/teamwork-alternative",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Alternatives", "Teamwork Alternative"]}
        title="Best Teamwork Alternatives in 2026"
        intro={[
          "Teamwork is an agency tool, and it is honest about that. Client projects, retainers, billable time, invoicing, and profitability sit next to tasks and milestones, which is more than most general project tools attempt.",
          "The friction is familiar: per-seat pricing on a feature-rich product, a dense interface that contributors need persuading to use, and separate products for things like help desk that a smaller studio may not want to buy. Teams often look for an alternative when they need the delivery side to be simpler and the billing side to live elsewhere.",
        ]}
        sections={[
          {
            h2: "Why Teams Look for a Teamwork Alternative",
            bullets: [
              "Per-seat pricing across a full agency, including freelancers and part-time staff.",
              "A large feature surface where many teams use a fraction of what they pay for.",
              "Contributors find the interface heavy for day-to-day task work.",
              "Billing and help desk functionality lives in separate products with separate costs.",
              "Setup of project templates, billing rates, and permissions takes real administration.",
            ],
          },
          {
            h2: "What to Look For in an Alternative",
            bullets: [
              "Fast setup for the delivery side: projects, tasks, owners, dates.",
              "A timeline and Gantt view for client-facing schedules.",
              "Time reporting if you bill by the hour; a clean export if you invoice elsewhere.",
              "A portfolio view across client projects, so capacity is visible in one place.",
              "A free tier that lets a small studio evaluate without a sales call.",
            ],
          },
          {
            h2: "Theta PM vs Teamwork",
            paragraphs: [
              "Theta PM covers the delivery core — client projects, tasks, boards, timeline, milestones, time tracking with reports on Pro — and stays out of invoicing. For studios that bill through a separate finance tool, that split is simpler than paying for a billing engine twice.",
            ],
            table: {
              headers: ["", "Theta PM", "Teamwork"],
              rows: [
                ["Client projects", "Yes, a project per client or engagement", "Yes, with client companies"],
                ["Views", "Board, list, timeline, Gantt, calendar, dashboard", "Board, list, timeline, Gantt, workload"],
                ["Time tracking", "With reports on Pro", "Core feature, billing-oriented"],
                ["Invoicing & retainers", "Not included", "Included"],
                ["Portfolio view", "Yes", "Yes"],
                ["Setup", "Minutes", "Template and rate configuration"],
                ["Free tier", "Up to 5 users, 3 boards, 1 integration", "Trial-based"],
                ["Best at", "Delivery tracking", "Client billing plus delivery"],
              ],
            },
          },
          {
            h2: "Where Teamwork Still Wins",
            paragraphs: [
              "If billing is the center of your operation, Teamwork is doing work you would otherwise rebuild.",
            ],
            bullets: [
              "Retainers, billable rates, and invoicing in the same system as the project.",
              "Profitability reporting that ties hours to client revenue.",
              "Client users who can see their own project without a separate portal.",
              "An established agency operation where templates and rates are already configured.",
            ],
          },
          {
            h2: "Migrating From Teamwork",
            paragraphs: [
              "Export first, decide second. Agency workspaces usually carry years of historical projects that should not be migrated.",
            ],
            bullets: [
              "Export only active and upcoming client projects; leave history in Teamwork as an archive.",
              "Create one project per client engagement, keeping the client name in the project title if you do not have separate client records.",
              "Map Teamwork task lists to board columns; map priority and assigned team to fields.",
              "Bring over dates so the timeline and Gantt reflect the schedule immediately.",
              "Keep time entry in Teamwork until the current billing period closes, then switch.",
            ],
          },
          {
            h2: "Cost at Agency Scale",
            paragraphs: [
              "Theta PM is free for up to five users, then Growth is $5 per month plus $2 per user, Pro is $10 plus $3 per user, and Theta Plus is $20 plus $4 per user with no user cap — annual billing takes 20% off.",
              "For a studio with freelancers and part-time contributors, the interesting comparison is not the per-seat rate but how many seats you actually need. If billing stays in a finance tool, Theta Plus with unlimited users often undercuts a per-seat agency suite.",
            ],
          },
        ]}
        faqs={[
          {
            q: "What is the best Teamwork alternative for agencies?",
            a: "Theta PM fits agencies that want clear delivery tracking — client projects, timeline, milestones, portfolio, time reports on Pro — and already invoice through a separate finance tool.",
          },
          {
            q: "Does Theta PM handle client billing and invoicing?",
            a: "No. Theta PM tracks time with reports on Pro, but invoicing and retainer billing are not part of the product. If billing must live inside your project tool, Teamwork has the deeper feature set.",
          },
          {
            q: "Can I import Teamwork projects?",
            a: "Yes. Export active projects to CSV, create one project per client engagement, map task lists to columns, and include dates so timeline and Gantt views populate. Leave historical projects archived in Teamwork.",
          },
          {
            q: "Is Theta PM cheaper than Teamwork?",
            a: "Depends on seats. Theta PM is free up to five users, then $5 per month plus $2 per user on Growth and $10 plus $3 per user on Pro, with 20% off annually. Theta Plus removes the user cap at $20 plus $4 per user, which usually wins for studios with many part-time contributors.",
          },
          {
            q: "When should I stay on Teamwork?",
            a: "If retainers, billable rates, and profitability reporting are central to how your agency runs, keeping billing and delivery in one system is worth the per-seat cost.",
          },
        ]}
        internalLinks={[
          { label: "Best Project Management Software 2026", href: "/project-management-software" },
          { label: "Portfolio view", href: "/features/portfolio" },
          { label: "Reports", href: "/features/reports" },
          { label: "Milestones", href: "/features/milestones" },
          { label: "Theta PM for growing businesses", href: "/pricing/business" },
          { label: "Pricing", href: "/pricing" },
        ]}
      />
    </SeoShell>
  );
}
