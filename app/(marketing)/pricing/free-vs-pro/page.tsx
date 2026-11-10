import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Theta PM Free vs Pro: Which Plan Do You Need?",
  description:
    "A side-by-side look at the Theta PM free plan, Growth, and Pro — user limits, boards, storage, automations, and integrations — with cost examples at real team sizes.",
  path: "/pricing/free-vs-pro",
});

const pageSchema = [
  {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: [
      {
        "@type": "Question",
        name: "What is the difference between Theta PM Free and Pro?",
        acceptedAnswer: {
          "@type": "Answer",
          text: "Free covers up to five users, unlimited projects and tasks, three kanban boards, 256MB of storage, and one integration. Pro raises that to 50 users, 50GB of storage, unlimited integrations and automations, unlimited custom fields, full sprints and goals, advanced analytics, time tracking with reports, and API access.",
        },
      },
    ],
  },
];

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Pricing", "Free vs Pro"]}
        title="Free vs Pro: Which Theta PM Plan Do You Need?"
        intro={[
          "The honest version: most teams under fifteen people do not need Pro, and most teams over thirty will hit the Growth ceiling within a month. The free plan is a real plan, not a trial, so the decision is about limits rather than access.",
          "Here is exactly what changes between Free, Growth, and Pro — including the numbers the pricing cards compress into a single line.",
        ]}
        sections={[
          {
            h2: "What the Free Plan Actually Includes",
            paragraphs: [
              "Free is not a feature demo. You get the working product: projects, tasks, multiple views, collaboration, and one integration. The constraint is scale, not capability.",
            ],
            bullets: [
              "Up to 5 users.",
              "Unlimited projects and tasks.",
              "3 kanban boards.",
              "256MB of storage.",
              "1 integration, such as GitHub or Slack.",
              "Email support with a 72-hour response target.",
            ],
          },
          {
            h2: "What Pro Adds",
            paragraphs: [
              "Pro is the plan for teams where project management is now load-bearing — several projects running at once, more than one team, and reporting that someone outside the team reads.",
            ],
            bullets: [
              "Up to 50 users, plus unlimited projects, tasks, and teams.",
              "50GB of storage.",
              "Unlimited integrations, so every repository and channel can be connected.",
              "Unlimited automations and unlimited custom fields per project.",
              "Full sprints and goals rather than the reduced Growth version.",
              "Advanced analytics and time tracking with reports.",
              "API access for anything the UI does not cover.",
            ],
          },
          {
            h2: "The Three Plans Side by Side",
            table: {
              headers: ["", "Free", "Growth", "Pro"],
              rows: [
                ["Price", "$0", "$5/mo + $2 per user", "$10/mo + $3 per user"],
                ["Users", "Up to 5", "Up to 15", "Up to 50"],
                ["Projects & tasks", "Unlimited", "Unlimited", "Unlimited"],
                ["Boards", "3", "Unlimited", "Unlimited"],
                ["Storage", "256MB", "5GB", "50GB"],
                ["Integrations", "1", "3", "Unlimited"],
                ["Automations", "—", "10 per month", "Unlimited"],
                ["Custom fields", "—", "5 per project", "Unlimited"],
                ["Sprints & goals", "—", "Included", "Full"],
                ["Time tracking", "—", "—", "With reports"],
                ["API access", "—", "—", "Yes"],
                ["Support", "Email, 72h", "Email", "Priority"],
              ],
            },
          },
          {
            h2: "What It Costs at Real Team Sizes",
            paragraphs: [
              "Paid plans are a small base fee plus a per-user charge, so the total depends on how many people you invite. Annual billing takes 20% off the total.",
            ],
            table: {
              headers: ["Team size", "Growth", "Pro"],
              rows: [
                ["5 people", "$5 + $10 = $15/mo", "$10 + $15 = $25/mo"],
                ["8 people", "$5 + $16 = $21/mo", "$10 + $24 = $34/mo"],
                ["15 people", "$5 + $30 = $35/mo", "$10 + $45 = $55/mo"],
                ["30 people", "Above the user limit", "$10 + $90 = $100/mo"],
              ],
            },
          },
          {
            h2: "How to Decide in One Question",
            paragraphs: [
              "Ask what would break first if you stayed where you are. That answer maps directly to a plan.",
            ],
            h3s: [
              {
                heading: "Stay on Free if you are up to five people with one active project",
                body: "Three boards and a single integration are enough for a small team doing focused work. Upgrade when you need a second integration or a sixth seat, not before.",
              },
              {
                heading: "Choose Growth if you need sprints, more boards, or a third integration",
                body: "Growth is the plan for a team of six to fifteen that has started running real cycles: custom fields, sprints and goals, CSV export, and ten automations a month cover most small-team workflows.",
              },
              {
                heading: "Choose Pro if reporting or scale is the constraint",
                body: "Unlimited automations, unlimited integrations, advanced analytics, time tracking, and API access are Pro-only. If someone outside the team reads your reports, or you are connecting several repositories, this is the plan.",
              },
              {
                heading: "Look at Theta Plus beyond 50 users",
                body: "Plus removes the user cap entirely and adds role-based permissions, at $20 per month plus $4 per user.",
              },
            ],
          },
          {
            h2: "What Upgrading Does Not Change",
            paragraphs: [
              "Your workspace is not rebuilt when you change plan. Projects, tasks, comments, files, and integrations stay exactly where they are — the limits move, the data does not. Downgrading works the same way; if you are over a new limit, nothing is deleted, but you cannot add past it until you are back under.",
              "That is deliberate. Plan changes should be a billing decision, not a migration project.",
            ],
          },
        ]}
        faqs={[
          {
            q: "Is the free plan really free, or a trial?",
            a: "It is free with no time limit: up to five users, unlimited projects and tasks, three kanban boards, 256MB of storage, and one integration. No card is required to start.",
          },
          {
            q: "What happens to my data if I downgrade?",
            a: "Nothing is deleted. You keep every project, task, comment, and file. If you are above the new plan's limits, you simply cannot add more until you are back under them.",
          },
          {
            q: "Do I pay per user or per workspace?",
            a: "Paid plans are a base monthly fee plus a per-user charge: Growth is $5 plus $2 per user, Pro is $10 plus $3 per user, and Theta Plus is $20 plus $4 per user. Annual billing is 20% off.",
          },
          {
            q: "Is time tracking only on Pro?",
            a: "Time tracking with reports is a Pro feature. Growth includes sprints, goals, custom fields, and CSV export, which cover planning but not time reporting.",
          },
          {
            q: "Can I try Pro before paying?",
            a: "Yes — paid plans can be started on a trial, and you can move between plans as your team changes size. Check the pricing page for the current trial length before you commit.",
          },
        ]}
        internalLinks={[
          { label: "Full pricing", href: "/pricing" },
          { label: "Theta PM for growing businesses", href: "/pricing/business" },
          { label: "Theta Plus for larger organizations", href: "/pricing/enterprise" },
          { label: "Task management", href: "/features/tasks" },
          { label: "Automation", href: "/features/automation" },
          { label: "Integrations", href: "/features/integrations" },
        ]}
        schema={pageSchema}
      />
    </SeoShell>
  );
}
