import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Project Management Integrations | Theta PM",
  description:
    "Connect GitHub, Bitbucket, Slack, Figma, Canva, Asana, Trello, and WooCommerce to Theta PM so updates land where your team already works.",
  path: "/features/integrations",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Features", "Integrations"]}
        title="Project Management Integrations"
        intro={[
          "A project tool that does not talk to your other tools becomes one more tab to check. Theta PM connects to the places work actually happens — repositories, chat channels, design files, order dashboards — so status updates travel without anyone forwarding them.",
          "Each connection is added from the Apps screen inside your workspace, authorized through the provider's own flow, and removable whenever you want.",
        ]}
        sections={[
          {
            h2: "Every Integration Theta PM Ships With",
            table: {
              headers: ["Tool", "Category", "What it brings into Theta PM"],
              rows: [
                ["GitHub", "Development", "Repositories, issues, and pull requests linked to tasks"],
                ["Bitbucket", "Development", "Repository and pull request data for the same workflow"],
                ["Slack", "Communication", "Task alerts, daily standups, sprint summaries, /theta commands"],
                ["Figma", "Design", "Live design files embedded in project views"],
                ["Canva", "Design", "Canva designs accessible from the workspace"],
                ["Asana", "Productivity", "Project and task imports that stay in sync"],
                ["Trello", "Productivity", "Cards converted to tasks with board status sync"],
                ["WooCommerce", "E-commerce", "Products and webshop orders on the project dashboard"],
              ],
            },
          },
          {
            h2: "Development: GitHub and Bitbucket",
            paragraphs: [
              "Engineering work is the clearest case for an integration, because the truth about whether something shipped lives in the repository rather than the board.",
              "Connect a repository and you can link pull requests to the tasks they deliver, push a task out as an issue, and let status flow both ways. Closing the issue completes the task; completing the task closes the issue.",
            ],
            bullets: [
              "Link pull requests and issues to tasks, not to a project in general.",
              "Keep task status and issue state in agreement without double entry.",
              "Choose which repositories the workspace can read, including private ones.",
              "See code status on the same board as the rest of the plan.",
            ],
          },
          {
            h2: "Communication: Slack",
            paragraphs: [
              "Notifications only help if they arrive where people are looking. The Slack connection posts task updates, a daily standup digest, and sprint summaries into a channel you choose, and adds slash commands for the three things people ask most: create, check, and assign.",
            ],
            bullets: [
              "Task and workspace notifications formatted as readable messages.",
              "Daily standup digest: in progress, completed today, and up next.",
              "Sprint summary posted at the end of a cycle.",
              "/theta create, /theta status, and /theta assign without leaving the channel.",
              "Any Slack message can become a task with the message shortcut.",
            ],
          },
          {
            h2: "Design: Figma and Canva",
            paragraphs: [
              "Design handoff breaks down when the file lives somewhere the task cannot reach. Connecting Figma or Canva puts the design next to the work it belongs to, so a task can be read alongside the screen it describes.",
            ],
            bullets: [
              "Embed live Figma files in project views instead of exporting screenshots.",
              "Surface Canva designs from inside the workspace.",
              "Keep feedback attached to the task rather than scattered across channels.",
              "No more \"latest version\" ambiguity in a review thread.",
            ],
          },
          {
            h2: "Imports: Asana and Trello",
            paragraphs: [
              "If you are moving from another tool, the integration is also the migration path. Asana projects and Trello cards can be brought in as tasks, keeping the structure your team already understands.",
            ],
            bullets: [
              "Import Asana projects and continue syncing tasks across both platforms.",
              "Convert Trello cards to tasks and sync board statuses.",
              "Keep the familiar board model — lists become columns, labels become fields.",
              "Run the old tool and Theta PM side by side for a week before switching over.",
            ],
          },
          {
            h2: "Commerce: WooCommerce",
            paragraphs: [
              "For teams running a storefront alongside delivery work, WooCommerce brings products and orders onto the project dashboard, so fulfilment work sits next to the projects that support it instead of in a separate spreadsheet.",
            ],
            bullets: [
              "Fetch products into the workspace.",
              "Sync webshop orders to the project dashboard.",
              "Connect with your site URL and API credentials — no plugin installation.",
            ],
          },
          {
            h2: "How Connections Are Secured",
            bullets: [
              "OAuth wherever the provider supports it, so passwords and personal tokens are never stored.",
              "Provider credentials that must be supplied directly are encrypted at rest.",
              "Tokens are never returned to the browser — the API only reports provider, config, and last update.",
              "Connections are scoped to one workspace, so a team sees its own integrations only.",
              "Disconnecting removes the stored credentials and stops syncing immediately.",
            ],
          },
          {
            h2: "Integrations by Plan",
            paragraphs: [
              "Integrations are included on every plan. The limit is how many connections a workspace can hold at once.",
            ],
            table: {
              headers: ["Plan", "Connections", "Good for"],
              rows: [
                ["Free", "1", "A small team connecting the one tool it cannot work without"],
                ["Growth", "3", "Code, chat, and a design or import tool"],
                ["Pro", "Unlimited", "Several repositories and workspaces across teams"],
                ["Theta Plus", "Unlimited", "Org-wide connections with priority support"],
              ],
            },
          },
          {
            h2: "Adding Your First Integration",
            bullets: [
              "Open your workspace and go to Apps.",
              "Pick a tool from the list and choose Connect.",
              "Authorize the connection with that provider's own flow.",
              "Return to a task and check that the new link or notification is available.",
              "Add more connections as your plan allows.",
            ],
          },
        ]}
        faqs={[
          {
            q: "How many integrations can I connect?",
            a: "One on the free plan, three on Growth, and unlimited on Pro and Theta Plus. The limit counts connections per workspace, not repositories inside a connection.",
          },
          {
            q: "Do I need to install anything for integrations?",
            a: "No. Integrations are connected from the Apps screen inside Theta PM and authorized through each provider's own flow. WooCommerce, for example, uses your site URL and API credentials rather than a plugin.",
          },
          {
            q: "Which integrations are best for engineering teams?",
            a: "GitHub or Bitbucket first, because they tie pull requests and issues to tasks. Slack second, so the board's status updates reach the channel the team already reads.",
          },
          {
            q: "Can I disconnect an integration later?",
            a: "Yes. Disconnecting from the Apps screen removes the stored credentials and stops syncing immediately. Your tasks and projects stay exactly where they are.",
          },
          {
            q: "Are integration credentials safe?",
            a: "Tokens are encrypted at rest and never sent to the browser — the API only returns the provider name, basic config, and last update time. Credentials are scoped per workspace.",
          },
        ]}
        internalLinks={[
          { label: "GitHub integration", href: "/integrations/github" },
          { label: "Slack integration", href: "/integrations/slack" },
          { label: "Task management", href: "/features/tasks" },
          { label: "Collaboration features", href: "/features/collaboration" },
          { label: "How to choose project management software", href: "/guides/how-to-choose-project-management-software" },
          { label: "Pricing", href: "/pricing" },
        ]}
      />
    </SeoShell>
  );
}
