import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Slack Integration for Theta PM: Standups and Task Alerts",
  description:
    "Send task alerts, daily standups, and sprint summaries to Slack, create tasks from a message, and work with /theta commands without leaving the channel.",
  path: "/integrations/slack",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Integrations", "Slack"]}
        title="Slack Integration for Theta PM"
        intro={[
          "Your team already has Slack open all day. Announcing every status change there by hand is the kind of job nobody keeps up with past the second week.",
          "The Theta PM Slack integration posts the updates that matter — assignments, daily standups, sprint summaries — into the channel you choose, and lets you create and check tasks without switching tabs.",
        ]}
        sections={[
          {
            h2: "What the Slack Integration Does",
            paragraphs: [
              "Connect your workspace through OAuth, pick a channel, and Theta PM starts posting there. The connection is scoped to a single workspace, so a Slack team only ever sees its own projects.",
            ],
            bullets: [
              "Send task notifications to the channel your team already reads.",
              "Post a daily standup digest: what is in progress, what shipped today, and what is next.",
              "Post a sprint summary when a sprint closes.",
              "Create, check, and assign tasks with /theta slash commands.",
              "Turn an existing Slack message into a task with a message shortcut.",
            ],
          },
          {
            h2: "Notifications Where the Team Already Is",
            paragraphs: [
              "A task assignment that only exists inside a project tool gets missed. A task assignment posted to the project's channel gets picked up.",
              "Theta PM sends formatted messages rather than raw JSON blobs, so a notification reads like a status update: the task, its project, its owner, and its current state, with the status visible at a glance.",
            ],
            bullets: [
              "Task and workspace notifications built with Slack's block formatting.",
              "The channel is chosen during setup and can be changed later.",
              "Channels are listed through Slack's API, so you pick from real channels instead of typing an ID.",
              "Only the connected channel receives posts — Theta PM does not message people directly.",
            ],
          },
          {
            h2: "Standups and Sprint Summaries, Written for You",
            paragraphs: [
              "The daily standup is the meeting most likely to be skipped and most annoying to write. Theta PM assembles it from the board: tasks currently in progress, tasks completed since midnight, and the work coming next.",
              "Sprint summaries work the same way at a larger scale — a written record of what the sprint actually delivered, posted where the team will see it without opening a dashboard.",
            ],
            bullets: [
              "In-progress work, so the channel knows what is being built right now.",
              "Completed today, with completion timestamps rather than guesses.",
              "Upcoming work, ordered by status and priority.",
              "Sprint summary at the end of the cycle, so retro conversations start from facts.",
            ],
          },
          {
            h2: "Create and Update Tasks From Slack",
            paragraphs: [
              "Some requests arrive as a message and should become a task in the same breath. The message shortcut does exactly that, using the message text as the task title and keeping it in the project you are working in.",
              "For quick checks during a conversation, slash commands cover the three things people ask most often.",
            ],
            bullets: [
              "/theta create <title> creates a task in the linked workspace.",
              "/theta status <task-id> returns the current state of a task.",
              "/theta assign <task-id> @user assigns it without opening the app.",
              "The message shortcut converts any Slack message into a task.",
              "Slash command usage is echoed back with the expected format when an argument is missing.",
            ],
          },
          {
            h2: "Keeping the Connection Safe",
            paragraphs: [
              "Slack access is stored the same way as every other Theta PM integration: encrypted on the server, never exposed to the browser, and removable at any time.",
            ],
            bullets: [
              "OAuth install — no bot token to copy around by hand.",
              "Access tokens encrypted at rest and never returned by the API.",
              "Disconnecting the integration stops posts immediately.",
              "Workspace-scoped: a channel sees one workspace's projects, not the whole account.",
            ],
          },
          {
            h2: "Setting Up the Slack Integration",
            bullets: [
              "Open your workspace and go to Apps.",
              "Choose Slack and authorize the connection for your Slack workspace.",
              "Pick the channel that should receive updates.",
              "Run /theta create Test task to confirm the command works.",
              "Move that task across the board to see the notification arrive.",
            ],
          },
          {
            h2: "Integrations by Plan",
            paragraphs: [
              "Every plan includes integrations. If Slack is the only tool you need to connect, the free plan covers it.",
            ],
            table: {
              headers: ["Plan", "Integrations", "Typical setup"],
              rows: [
                ["Free", "1 integration", "Slack alone, or GitHub alone"],
                ["Growth", "3 integrations", "Slack plus code and a design or import tool"],
                ["Pro", "Unlimited", "Several Slack workspaces and repositories"],
                ["Theta Plus", "Unlimited", "Org-wide connections with priority support"],
              ],
            },
          },
        ]}
        faqs={[
          {
            q: "Which slash commands does the Slack integration support?",
            a: "Three: /theta create <title> to make a task, /theta status <task-id> to check one, and /theta assign <task-id> @user to assign it. Run /theta on its own and Theta PM replies with the available commands.",
          },
          {
            q: "Can I create a task from an existing Slack message?",
            a: "Yes. The message shortcut turns a Slack message into a task in the linked workspace, so a request that arrives in conversation becomes tracked work without being retyped.",
          },
          {
            q: "Where do notifications get posted?",
            a: "To the channel you choose during setup. Theta PM lists your Slack channels through the API so you pick a real one, and you can change it later without reinstalling the integration.",
          },
          {
            q: "Do I need Slack admin approval to install it?",
            a: "Sometimes. Many workspaces require an admin to approve a new app before it can be installed. If the authorization step is blocked, ask a Slack admin to approve Theta PM for the workspace, then retry the connection.",
          },
          {
            q: "Is the Slack integration available on the free plan?",
            a: "Yes. The free plan includes one integration, so Slack on its own fits. Growth allows three connections if you also want GitHub or a design tool, and Pro and Theta Plus are unlimited.",
          },
        ]}
        internalLinks={[
          { label: "All integrations", href: "/features/integrations" },
          { label: "GitHub integration", href: "/integrations/github" },
          { label: "Task management", href: "/features/tasks" },
          { label: "What is a sprint?", href: "/guides/what-is-a-sprint" },
          { label: "Task management best practices", href: "/guides/task-management-best-practices" },
          { label: "Pricing", href: "/pricing" },
        ]}
      />
    </SeoShell>
  );
}
