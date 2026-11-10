import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Project Management for Growing Businesses | Theta PM",
  description:
    "Which Theta PM plan fits a growing business? Compare Growth, Pro, and Theta Plus by headcount, automations, storage, and reporting — with cost examples.",
  path: "/pricing/business",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Pricing", "Business"]}
        title="Project Management for Growing Businesses"
        intro={[
          "A business does not outgrow a project tool all at once. It outgrows it one concrete limit at a time: the sixth person who needs a seat, the fourth integration, the automation that would replace a weekly copy-paste, the report a client or investor asks for.",
          "This page lays out which Theta PM plan fits a business at each stage, what it costs at that headcount, and the specific signals that mean it is time to move up.",
        ]}
        sections={[
          {
            h2: "The Three Paid Stages",
            paragraphs: [
              "Theta PM has four plans in total: Free, Growth, Pro, and Theta Plus. A business will usually pass through Growth and Pro, and move to Plus when headcount stops being predictable.",
            ],
            table: {
              headers: ["Stage", "Plan", "Users", "Price"],
              rows: [
                ["Small team, first process", "Growth", "Up to 15", "$5/mo + $2 per user"],
                ["Multiple teams, reporting", "Pro", "Up to 50", "$10/mo + $3 per user"],
                ["Whole organization", "Theta Plus", "Unlimited", "$20/mo + $4 per user"],
              ],
            },
          },
          {
            h2: "Stage 1: Six to Fifteen People on Growth",
            paragraphs: [
              "This is the stage where a business stops being a group of people who all know what everyone is doing. Documented process starts to matter, and so does a tool that encodes it.",
              "Growth is built for exactly this: unlimited projects and boards, sprints and goals for teams that want cycles, five custom fields per project for the dimensions your business tracks, ten automations a month, and three integrations.",
            ],
            bullets: [
              "Unlimited boards, so each client, product line, or department can have its own without hitting a cap.",
              "5GB of storage for briefs, assets, and exported reports.",
              "Three integrations — typically GitHub or Bitbucket, Slack, and one design or storefront tool.",
              "CSV export, which matters the first time a finance or ops person asks for the data.",
              "Sprints and goals for teams that plan in cycles rather than continuous flow.",
            ],
          },
          {
            h2: "Stage 2: Fifteen to Fifty People on Pro",
            paragraphs: [
              "At this size a business usually has more than one team, more than one active integration, and at least one reporting consumer who is not on the delivery team. Growth's ceilings start to bind — three integrations and ten automations a month go quickly when several teams share a workspace.",
              "Pro removes those ceilings: unlimited integrations, unlimited automations, unlimited custom fields, advanced analytics, time tracking with reports, and API access for anything the interface does not cover.",
            ],
            bullets: [
              "Advanced analytics for workload, throughput, and delivery trends across projects.",
              "Time tracking with reports — the feature most service businesses need first for billing and capacity.",
              "API access, so internal tools and dashboards can read workspace data.",
              "Unlimited integrations, which matters once several repositories and channels are in play.",
              "50GB of storage for growing asset libraries.",
            ],
          },
          {
            h2: "Stage 3: Beyond Fifty People on Theta Plus",
            paragraphs: [
              "Once headcount stops being predictable — contractors, seasonal staff, multiple departments — per-seat planning becomes guesswork. Theta Plus removes the user cap and adds role-based permissions so access can be granted by role rather than person by person.",
              "Plus is $20 per month plus $4 per user, with the same 20% annual discount as the other paid plans.",
            ],
            bullets: [
              "Unlimited users, so inviting a contractor does not require a plan review.",
              "Role-based permissions for organizations that need to separate access by function.",
              "Unlimited integrations and automations, as on Pro.",
              "Priority support.",
            ],
          },
          {
            h2: "What It Costs at Each Headcount",
            paragraphs: [
              "Paid plans are a base fee plus a per-user charge, so the total scales with the team rather than jumping at a tier boundary. Annual billing takes 20% off.",
            ],
            table: {
              headers: ["Headcount", "Growth", "Pro", "Theta Plus"],
              rows: [
                ["10", "$5 + $20 = $25/mo", "$10 + $30 = $40/mo", "$20 + $40 = $60/mo"],
                ["15", "$5 + $30 = $35/mo", "$10 + $45 = $55/mo", "$20 + $60 = $80/mo"],
                ["25", "Over the user cap", "$10 + $75 = $85/mo", "$20 + $100 = $120/mo"],
                ["40", "Over the user cap", "$10 + $120 = $130/mo", "$20 + $160 = $180/mo"],
              ],
            },
          },
          {
            h2: "Signals It Is Time to Move Up",
            paragraphs: [
              "Plan upgrades should be triggered by a limit you actually hit, not by a comparison table. These are the honest triggers.",
            ],
            bullets: [
              "You are declining an invite because of the user cap — move up.",
              "You need a fourth integration, or you are manually forwarding data between two tools — move up.",
              "An automation you need runs more than ten times a month — Growth to Pro.",
              "Someone outside the delivery team asks for a workload or time report — Pro.",
              "You cannot find a task because the board limit forced two projects onto one board — Growth.",
              "You are managing contractors and permissions by memory — Theta Plus.",
            ],
          },
          {
            h2: "Rolling It Out Without Disrupting Delivery",
            paragraphs: [
              "A plan change is not a migration, so the rollout risk is organizational, not technical. Projects, tasks, and integrations stay in place when the plan changes.",
            ],
            bullets: [
              "Pick one active project and run it in Theta PM for two weeks before moving everything.",
              "Import existing work from Asana or Trello if that is where the team is today.",
              "Connect the integrations the team already uses — GitHub or Bitbucket, and Slack — before asking anyone to change habits.",
              "Set two automations that remove real weekly work, then add more once the team trusts them.",
              "Review at the end of the first month: what is still tracked in a spreadsheet, and why?",
            ],
          },
        ]}
        faqs={[
          {
            q: "Is there a plan called Business?",
            a: "No. Theta PM has four plans: Free, Growth, Pro, and Theta Plus. A growing business typically starts on Growth, moves to Pro when reporting or integration limits bind, and moves to Theta Plus when it needs unlimited users and role-based permissions.",
          },
          {
            q: "How is pricing calculated for a business?",
            a: "Each paid plan is a base monthly fee plus a per-user charge: Growth is $5 plus $2 per user, Pro is $10 plus $3 per user, and Theta Plus is $20 plus $4 per user. Annual billing takes 20% off the total.",
          },
          {
            q: "Do we have to pay for users who only view work?",
            a: "Pricing is per user on the plan's headcount limit. If a large part of your organization only needs to read status, keep those readers out of the workspace and share reports instead, or move to Theta Plus where the user cap is removed.",
          },
          {
            q: "What happens when we hit the user limit mid-project?",
            a: "Nothing is locked or deleted. You simply cannot add more members until you upgrade. Projects, tasks, and integrations continue working, so an upgrade can be handled at the next billing decision.",
          },
          {
            q: "Can we change plans later?",
            a: "Yes, up or down. Your workspace is preserved across plan changes; only the limits move. If you downgrade while over a limit, existing data stays and new additions wait until you are back under it.",
          },
        ]}
        internalLinks={[
          { label: "Full pricing", href: "/pricing" },
          { label: "Free vs Pro", href: "/pricing/free-vs-pro" },
          { label: "Theta Plus for larger organizations", href: "/pricing/enterprise" },
          { label: "Portfolio view", href: "/features/portfolio" },
          { label: "Reports", href: "/features/reports" },
          { label: "Integrations", href: "/features/integrations" },
        ]}
      />
    </SeoShell>
  );
}
