import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Theta PM Help Center",
  description:
    "Find help for Theta PM: documentation, project management guides, and how to contact support for questions about your workspace.",
  path: "/help",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Help"]}
        title="Theta PM Help Center"
        intro={[
          "Use the Help Center to find the right place for answers about Theta PM — from getting started with projects and boards to understanding features like automation, integrations, and reports.",
          "If you cannot find what you need in the documentation or guides, you can contact the team directly by email and include enough context for us to help with your workspace or account question.",
        ]}
        sections={[
          {
            h2: "Where to Find Answers",
            paragraphs: [
              "Different questions are answered best in different places. Start with the resource that matches what you are trying to do, then go deeper if you need implementation detail or a comparison.",
            ],
            bullets: [
              "Documentation: product-focused reference for how Theta PM works and how to use core features.",
              "Guides: practical explanations of project management methods such as Kanban, Agile, sprints, and prioritization.",
              "Resources: a curated entry point to guides and learning material available on the site.",
              "System Status: current service information and where to check if something is not working as expected.",
            ],
          },
          {
            h2: "Common Topics",
            paragraphs: [
              "Most support questions fall into a few categories. Knowing which one applies helps you find the right page faster and, if you contact us, helps us route your request.",
            ],
            h3s: [
              {
                heading: "Getting started",
                body: "Creating projects, adding tasks, choosing a view (board, list, timeline, or calendar), and inviting collaborators to a workspace.",
              },
              {
                heading: "Planning and delivery",
                body: "Using milestones, dependencies, automation, and reports to keep work organized and visible as it moves.",
              },
              {
                heading: "Integrations and account",
                body: "Connecting supported tools, understanding plan limits, and resolving access or billing questions for your workspace.",
              },
            ],
          },
          {
            h2: "Contact Support",
            paragraphs: [
              "For questions that are specific to your account, workspace configuration, or a problem you cannot resolve with the available documentation, contact us by email.",
            ],
            bullets: [
              "Email: support@thetapm.site",
              "Include the workspace or project name if relevant, what you were trying to do, and what you expected to happen.",
              "If the issue relates to service availability, check the System Status page as well so you have the latest information we have published.",
            ],
          },
        ]}
        faqs={[
          {
            q: "How do I contact Theta PM support?",
            a: "You can contact support by emailing support@thetapm.site. Include relevant details such as your workspace, the page or feature involved, and a clear description of the issue or question.",
          },
          {
            q: "Where can I learn how to use a specific feature?",
            a: "Start with the Documentation page for feature overviews and the Features section for how boards, tasks, timelines, automation, integrations, and reports work in Theta PM.",
          },
          {
            q: "Is there a guide for Kanban or Agile workflows?",
            a: "Yes. The Guides section includes articles on Kanban, Kanban vs Scrum, Agile methodology, sprints, prioritization, and related project management practices.",
          },
          {
            q: "What should I do if Theta PM seems unavailable?",
            a: "Check the System Status page for any published service information, then contact support@thetapm.site with the time, what you were doing, and any error you saw so we can investigate.",
          },
        ]}
        internalLinks={[
          { label: "Documentation", href: "/docs" },
          { label: "Resources", href: "/resources" },
          { label: "System Status", href: "/status" },
          { label: "Kanban Guide", href: "/guides/kanban" },
          { label: "Pricing", href: "/pricing" },
        ]}
      />
    </SeoShell>
  );
}
