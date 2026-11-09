import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "GitHub Integration for Project Management | Theta PM",
  description:
    "Connect GitHub to Theta PM to link pull requests and issues to tasks, turn tasks into issues, and close work automatically when the code ships.",
  path: "/integrations/github",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Integrations", "GitHub"]}
        title="GitHub Integration for Theta PM"
        intro={[
          "Code ships in GitHub. The work that produced it lives on a board. Most teams end up maintaining that connection by hand — pasting pull request links into tasks, closing issues twice, and hoping the status in both places still agrees by Friday.",
          "The Theta PM GitHub integration does that bookkeeping for you. Link a pull request to the task it delivers, push a task out as a GitHub issue, and let status changes flow both ways.",
        ]}
        sections={[
          {
            h2: "What the GitHub Integration Does",
            paragraphs: [
              "Theta PM connects to GitHub through OAuth and works with the repositories you grant it. Nothing is mirrored wholesale — you decide which task maps to which issue or pull request, so the board stays a plan rather than a copy of your issue tracker.",
            ],
            bullets: [
              "Connect once per workspace with your GitHub account — no personal access token to paste.",
              "Choose the repositories Theta PM can see, public or private.",
              "Turn any task into a GitHub issue with its own title, description, labels, and assignees.",
              "Attach a pull request to a task by pasting its URL.",
              "Keep task status and issue state in sync, in both directions.",
            ],
          },
          {
            h2: "Link Pull Requests to the Tasks They Deliver",
            paragraphs: [
              "A task that reads \"ship the billing fix\" is hard to audit a month later. Linking the pull request makes the connection permanent and visible to everyone on the project.",
              "Paste any GitHub pull request URL onto a task and Theta PM parses the owner, repository, and PR number, then stores them with the task. The link sits in the task detail view next to the description, comments, and activity feed, so the next person who opens the task can read the code without asking where it went.",
            ],
            bullets: [
              "Accepts standard GitHub pull request URLs and validates them before saving.",
              "Records the repository and PR number, not just a bare link.",
              "Turns standup and review conversations into \"open the task, open the diff\".",
              "Works the same way for issues, so bugs and feature work share one pattern.",
            ],
          },
          {
            h2: "Close the Loop When Work Is Done",
            paragraphs: [
              "The sync is deliberately two-way, because that is what stops engineers and project managers from updating the same item twice.",
            ],
            bullets: [
              "Close a linked GitHub issue and the Theta PM task moves to Done with a completion timestamp.",
              "Mark the Theta PM task Done and Theta PM closes the matching GitHub issue for you.",
              "Webhooks deliver issue and pull request events, so the board reflects reality shortly after it happens rather than at the next manual sync.",
              "Access tokens are encrypted at rest on the server and never returned to the browser.",
            ],
          },
          {
            h2: "Create Issues Without Copying and Pasting",
            paragraphs: [
              "When a task needs engineering detail, create the GitHub issue from Theta PM instead of describing it again in chat. The title, body, labels, and assignees you set are carried over, so the issue arrives ready to triage instead of half-written.",
            ],
            bullets: [
              "Pick the repository the issue belongs to at creation time.",
              "Carry labels and assignees across so triage rules keep working.",
              "Link the new issue back to the task automatically, which means status sync starts immediately.",
              "Keep the discussion in GitHub and the planning context in Theta PM — neither side duplicates the other.",
            ],
          },
          {
            h2: "Where It Shows Up on Your Board",
            paragraphs: [
              "Linked work is still ordinary work. Tasks with a pull request or issue attached appear on the same board as everything else, which means the engineering view and the planning view are the same view.",
            ],
            bullets: [
              "Kanban board columns reflect issue state without anyone dragging cards.",
              "Timeline and milestones show which release a linked task belongs to.",
              "Reports count completed work once, whether it was closed on GitHub or on the board.",
              "Automations can route newly linked tasks to the right owner or column.",
            ],
          },
          {
            h2: "Setting Up the GitHub Integration",
            bullets: [
              "Open your workspace and go to Apps.",
              "Choose GitHub and authorize the connection with your GitHub account.",
              "Grant access to the repositories Theta PM should be able to read.",
              "Open a task and link an issue, or paste a pull request URL.",
              "Close the issue on GitHub to confirm the status sync is live.",
            ],
          },
          {
            h2: "Integrations by Plan",
            paragraphs: [
              "Every plan includes integrations. The difference is how many connections a workspace can hold at once.",
            ],
            table: {
              headers: ["Plan", "Integrations", "Typical setup"],
              rows: [
                ["Free", "1 integration", "One repository connection for a small team"],
                ["Growth", "3 integrations", "Code, chat, and one design or import tool"],
                ["Pro", "Unlimited", "Several repositories across multiple teams"],
                ["Theta Plus", "Unlimited", "Org-wide connections with priority support"],
              ],
            },
          },
        ]}
        faqs={[
          {
            q: "Does the GitHub integration need a personal access token?",
            a: "No. You authorize the connection through GitHub's OAuth flow, so there is no token to generate, paste, or rotate. The access tokens GitHub issues are encrypted at rest and never returned to the browser.",
          },
          {
            q: "Does it work with private repositories?",
            a: "Yes. During setup you choose which repositories Theta PM can access, and private ones are supported. Repositories you do not grant are never read.",
          },
          {
            q: "Does merging a pull request close the task automatically?",
            a: "Closing the linked GitHub issue moves the Theta PM task to Done, and completing the task closes the issue. If you want a merge to finish the work, link the issue that the merge closes — that is the event the sync follows.",
          },
          {
            q: "Can one connection cover several repositories?",
            a: "Yes. A single GitHub connection covers every repository you grant it access to. Plan limits apply to the number of connections, not to the number of repositories inside one.",
          },
          {
            q: "Is the GitHub integration available on the free plan?",
            a: "Yes. The free plan includes one integration, which is enough to connect GitHub on its own. Growth allows three connections, and Pro and Theta Plus are unlimited.",
          },
        ]}
        internalLinks={[
          { label: "All integrations", href: "/features/integrations" },
          { label: "Slack integration", href: "/integrations/slack" },
          { label: "Kanban board software", href: "/features/kanban-board" },
          { label: "Theta PM vs Jira", href: "/project-management-software/theta-vs-jira" },
          { label: "What is a sprint?", href: "/guides/what-is-a-sprint" },
          { label: "Pricing", href: "/pricing" },
        ]}
      />
    </SeoShell>
  );
}
