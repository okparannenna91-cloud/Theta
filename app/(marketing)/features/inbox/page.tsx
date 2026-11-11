import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Team Inbox: Mentions, Updates, and Activity in One Feed",
  description:
    "A single inbox for mentions, comments, assignments, and project activity. See how Theta PM keeps updates out of chat threads and attached to the task.",
  path: "/features/inbox",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Features", "Inbox"]}
        title="Team Inbox and Notification Feed"
        intro={[
          "In most teams, project updates leak into chat. A question about a task is asked in a channel, answered in a thread, and lost by the next morning — while the task itself still looks untouched.",
          "Theta PM's inbox keeps that traffic inside the workspace. Mentions, comments, assignments, and status changes land in one feed, and each item links back to the task it belongs to, so the context is never a scroll away.",
        ]}
        sections={[
          {
            h2: "What Lands in the Inbox",
            paragraphs: [
              "The inbox is a single destination for the things that need a person's attention, drawn from the work rather than from a separate messaging layer.",
            ],
            bullets: [
              "Mentions and replies on tasks, so a question stays attached to the work it is about.",
              "Assignment and reassignment notices, so nobody discovers new work by accident.",
              "Status changes on tasks you follow, which is often the fastest signal that something moved.",
              "Due-date and overdue alerts, so deadlines surface before they pass rather than after.",
              "Project activity, so a lead can catch up on a project without opening every task.",
            ],
          },
          {
            h2: "Attached to the Work, Not Floating Beside It",
            paragraphs: [
              "The difference between an inbox in your project tool and a chat channel is what happens next. Every item in the Theta PM inbox resolves to a task or a project, with its status, owner, and discussion intact. Replying from the inbox updates the task conversation, so the decision lands where the work lives.",
            ],
            table: {
              headers: ["", "Chat channel", "Theta PM inbox"],
              rows: [
                ["Where the answer lives", "In a thread", "On the task"],
                ["Context for a newcomer", "Scroll back", "Open the task"],
                ["Does the task reflect it?", "No", "Yes"],
                ["Searchable later", "Maybe", "With the work"],
              ],
            },
          },
          {
            h2: "Direct Messages Inside the Workspace",
            paragraphs: [
              "Not every exchange belongs on a task. Direct messages let two people settle a detail without creating noise in a project feed, while staying in the same workspace as the work — so the context does not have to be re-explained when the outcome is applied.",
            ],
          },
          {
            h2: "Cutting Noise Without Missing Signal",
            paragraphs: [
              "A notification system fails in two directions: it sends too much and gets muted, or it sends too little and people stop trusting it. The inbox is organised around attention — what needs you, what changed on work you follow, and what happened in a project you lead — rather than broadcasting every event to everyone.",
            ],
            bullets: [
              "Follow the tasks and projects you are accountable for rather than the whole workspace.",
              "Let assignments and mentions reach people directly; those are the notifications with an action attached.",
              "Use project activity for catching up, not for interrupts.",
            ],
          },
          {
            h2: "Why This Belongs in a Project Tool",
            paragraphs: [
              "Every update that lives in chat is a status the project tool cannot see. When notifications route back to tasks, the board stays accurate and the discussion stays findable — which is the difference between a workspace that records decisions and one that merely stores files.",
            ],
          },
        ]}
        faqs={[
          {
            q: "What is a team inbox in project management?",
            a: "It is a single feed of the updates that need your attention — mentions, comments, assignments, status changes, and due dates — with each item linked to the task or project it belongs to.",
          },
          {
            q: "How is this different from Slack?",
            a: "Chat is organised around channels and conversations; the inbox is organised around work. Every item resolves to a task, a reply updates the task conversation, and nothing is lost in a thread that nobody returns to.",
          },
          {
            q: "Will I be notified about everything in the workspace?",
            a: "No. Notifications follow the tasks and projects you are involved in, plus direct mentions and assignments. Broad project activity is available for catching up without interrupting you.",
          },
          {
            q: "Can I reply to a comment from the inbox?",
            a: "Yes. Replying from the inbox posts to the task conversation, so the discussion stays attached to the work and remains searchable later.",
          },
          {
            q: "Does the inbox include direct messages?",
            a: "Yes. Direct messages let two people resolve a detail without adding noise to a project feed, while staying inside the workspace.",
          },
        ]}
        internalLinks={[
          { label: "Collaboration", href: "/features/collaboration" },
          { label: "Task Management Software", href: "/features/tasks" },
          { label: "Automation", href: "/features/automation" },
          { label: "Kanban Board Software", href: "/features/kanban-board" },
          { label: "Slack Integration", href: "/integrations/slack" },
          { label: "Pricing", href: "/pricing" },
        ]}
      />
    </SeoShell>
  );
}
