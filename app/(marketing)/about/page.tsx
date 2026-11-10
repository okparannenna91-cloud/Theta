import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "About Theta PM | Project Management Without the Setup Tax",
  description:
    "Theta PM is a PM-native project management platform for teams that want boards, timelines, and real collaboration in one place. Learn what we build and why.",
  path: "/about",
});

const pageSchema = [
  {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    name: "About Theta PM",
    description:
      "Theta PM is a PM-native project management platform for teams that want boards, timelines, and real collaboration in one place.",
    url: `${BASE}/about`,
  },
];

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "About"]}
        title="About Theta PM"
        intro={[
          "Theta PM is a project management platform built around a simple observation: most teams do not abandon project management software because it lacks features. They abandon it because getting started costs more than the work it was supposed to organize.",
          "So we built the opposite — a workspace where a project, its tasks, and the people working on them are the primary objects, and every view is a lens on that same data rather than a separate setup exercise.",
        ]}
        sections={[
          {
            h2: "What Theta PM Is",
            paragraphs: [
              "Theta PM is a PM-native workspace. That phrase is deliberate: the tool is built around projects and tasks first, not around databases, documents, or spreadsheets that have been bent into project management shape.",
              "Every task lives in a project, belongs to a workspace, and can be read as a card, a row, a bar on a timeline, a block on a calendar, or a line in a report. There is one copy of the work; the views are just different ways of looking at it.",
            ],
            bullets: [
              "Projects and tasks as the core objects, with workspaces above them for teams.",
              "Board, list, timeline, Gantt, calendar, and dashboard views on the same data.",
              "Milestones and dependencies for planning work that has a sequence.",
              "Real-time collaboration: comments, mentions, and an activity feed on every task.",
              "Automation rules that move tasks and notify people without a developer.",
              "Integrations with GitHub, Bitbucket, Slack, Figma, Canva, Asana, Trello, and WooCommerce.",
            ],
          },
          {
            h2: "Why We Built It",
            paragraphs: [
              "The project management market solved the feature problem years ago. What it has not solved is the adoption problem. A tool that requires a consultant, a two-week rollout, and a dedicated administrator is a tool that a five-person team will quietly replace with a spreadsheet.",
              "Meanwhile the work itself has not gotten simpler. A modern team coordinates in chat, ships through a repository, reviews designs in a design tool, and reports upward in a document. Every one of those handoffs is a place where status goes stale.",
              "Theta PM exists to collapse that. Plan and track work in one place, connect the tools where the work actually happens, and let status update itself instead of asking people to update it twice.",
            ],
          },
          {
            h2: "The Principles We Build Against",
            paragraphs: [
              "These are constraints, not slogans — they decide what we ship and what we refuse to ship.",
            ],
            h3s: [
              {
                heading: "Time to first plan is measured in minutes",
                body: "A new team should be able to create a project, add tasks, and see a timeline without reading documentation. If a feature needs training to be useful, it is not finished.",
              },
              {
                heading: "One source of truth per task",
                body: "The board, the timeline, and the report must never disagree. That rules out duplicated task lists per view, and it is why linked GitHub issues sync status instead of forking it.",
              },
              {
                heading: "Structure without rigidity",
                body: "Teams that run sprints get sprints; teams that run continuous kanban get kanban. Neither should have to configure the other out of the way.",
              },
              {
                heading: "Fewer tabs",
                body: "If a team already works in GitHub or Slack, the product should meet them there rather than demand a new daily destination.",
              },
            ],
          },
          {
            h2: "Who Uses Theta PM",
            paragraphs: [
              "Theta PM is used by teams from roughly five to fifty people, plus larger organizations on our top plan. The common thread is not industry — it is that they want a plan they can trust without maintaining it by hand.",
            ],
            bullets: [
              "Software teams that want repository-linked tasks without a full agile administration layer.",
              "Agencies running several client projects who need a portfolio view and a calendar that agrees with the board.",
              "Startups that need planning and collaboration in one tool instead of stitching three together.",
              "Marketing and operations teams whose work is date-driven and review-heavy.",
              "Small teams that want a genuine free tier rather than a fourteen-day trial.",
            ],
          },
          {
            h2: "How the Product Is Built and Secured",
            paragraphs: [
              "Theta PM is a web application. Workspaces are isolated from one another with strict tenant separation, so a team only ever sees its own projects, tasks, and integrations.",
              "Data is encrypted in transit and at rest. Third-party credentials — GitHub and Slack tokens, store API keys — are encrypted on the server and never returned to the browser; the API reports only the provider, basic configuration, and when it last synced.",
            ],
            bullets: [
              "Workspace-level isolation with no cross-tenant data access.",
              "Encryption in transit and at rest.",
              "Integration tokens encrypted at rest and never exposed to the client.",
              "Role-based permissions on the top plan for organizations that need them.",
              "Integrations are removable at any time, which revokes the stored credentials.",
            ],
          },
          {
            h2: "Getting in Touch",
            paragraphs: [
              "Product questions, bug reports, and feature requests go through the Help Center and Documentation, which are linked below. If you are evaluating Theta PM for a larger organization, the pricing page covers what each plan includes and the Help Center is the fastest route to a human.",
            ],
          },
        ]}
        faqs={[
          {
            q: "Who is Theta PM for?",
            a: "Teams from about five to fifty people who want boards, timelines, and collaboration in one place — software teams, agencies, startups, and marketing or operations teams. Larger organizations run it on the Theta Plus plan.",
          },
          {
            q: "Is there a free plan?",
            a: "Yes, and it is not a trial. The free plan includes up to five users, unlimited projects and tasks, three kanban boards, 256MB of storage, and one integration.",
          },
          {
            q: "Does Theta PM require training to adopt?",
            a: "No. Projects, tasks, and the standard views work the way people expect, so a new member can be productive on their first day. Advanced features like automations and sprints are optional, not prerequisites for using the tool.",
          },
          {
            q: "Where is my data stored, and is it private?",
            a: "Every workspace is fully isolated with strict tenant separation. Data is encrypted in transit and at rest, and integration credentials are encrypted on the server and never sent to the browser.",
          },
          {
            q: "Is Theta PM hiring?",
            a: "We post open roles on the careers page. If nothing matches your skills today, the page is worth checking again — it is updated as roles open.",
          },
        ]}
        internalLinks={[
          { label: "Careers", href: "/careers" },
          { label: "Pricing", href: "/pricing" },
          { label: "Documentation", href: "/docs" },
          { label: "Help Center", href: "/help" },
          { label: "Best Project Management Software 2026", href: "/project-management-software" },
          { label: "Integrations", href: "/features/integrations" },
        ]}
        schema={pageSchema}
      />
    </SeoShell>
  );
}
