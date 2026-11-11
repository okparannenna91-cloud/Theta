import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Project Automation Software: Rules That Remove Busywork",
  description:
    "Automate task routing, status changes, assignments, and notifications in Theta PM. See how rule-based project automation works, with examples and limits.",
  path: "/features/automation",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Features", "Automation"]}
        title="Project Automation Software for Repetitive Work"
        intro={[
          "Most project busywork is not work. It is moving a card because someone finished a step, tagging an owner because a field changed, or pinging a reviewer because a status flipped. None of it requires judgement, and all of it competes for attention with the work that does.",
          "Theta PM keys automation off project events. You define what should happen, the workspace does it every time, and the audit log shows you exactly what ran — so automation saves time without becoming a system nobody can explain.",
        ]}
        sections={[
          {
            h2: "What You Can Automate",
            paragraphs: [
              "Automation in Theta PM is rule-based: something happens to a task, a project, or a member, and the workspace responds. The value is not in exotic triggers — it is in removing the same three clicks that people do dozens of times a week.",
            ],
            bullets: [
              "Move a task to a new status when a condition is met, so boards stay accurate without manual dragging.",
              "Assign or reassign an owner when a task enters a stage, so handoffs cannot be forgotten.",
              "Notify the right person when a task is created, blocked, or overdue.",
              "Set or adjust fields such as priority when work crosses a threshold.",
              "Chain rules so one event can kick off a sequence, without writing code.",
            ],
          },
          {
            h2: "Rules Built From Triggers, Conditions, and Actions",
            paragraphs: [
              "A rule reads left to right: when this happens, if these things are true, then do this. Keeping the three parts separate means a rule can be read and audited by someone who did not build it — which matters when a rule has been quietly moving other people's tasks.",
            ],
            h3s: [
              {
                heading: "Trigger",
                body: "The event that starts the rule — a task is created, a status changes, a due date passes, or a field is updated.",
              },
              {
                heading: "Condition",
                body: "The filter that decides whether this particular task qualifies. Conditions are where precision lives: without them, a rule will eventually fire on work it should not touch.",
              },
              {
                heading: "Action",
                body: "What the workspace does when the trigger fires and the condition matches — typically update a field, change status, assign an owner, or send a notification.",
              },
            ],
          },
          {
            h2: "Automation Examples Worth Building First",
            paragraphs: [
              "The best first rules are the ones you can describe in one sentence and that already annoy someone. A useful starting set:",
            ],
            table: {
              headers: ["When this happens", "If", "Then"],
              rows: [
                ["Task status changes to In Review", "Project is active", "Notify the reviewer and set the review date"],
                ["Task is created", "Priority is Urgent", "Assign to the project lead"],
                ["Task becomes Blocked", "—", "Post to the project activity feed"],
                ["Task is overdue", "Status is not Done", "Notify the owner and flag it in the inbox"],
              ],
            },
          },
          {
            h2: "Where Automation Belongs — and Where It Does Not",
            paragraphs: [
              "Automation is excellent at consistency and terrible at judgement. A rule that reassigns ownership can quietly move work to someone on holiday; a rule that auto-closes tasks will eventually close one that was not finished. If you would not sign off on the action happening unattended, do not automate it.",
            ],
            bullets: [
              "Automate routing, notification, and status hygiene — the mechanical parts.",
              "Do not automate decisions that need context: estimates, priorities that depend on negotiation, or closure of work you have not verified.",
              "Keep conditions narrow. A rule with no condition is a rule that will fire on everything eventually.",
            ],
          },
          {
            h2: "An Audit Trail You Can Actually Read",
            paragraphs: [
              "Every run is recorded, so when a task changes unexpectedly you can see whether a person or a rule did it, and which rule. Automation that cannot be observed becomes a source of distrust; automation with a readable log becomes something the team relies on.",
            ],
          },
        ]}
        faqs={[
          {
            q: "What is project automation?",
            a: "Project automation is a set of rules that perform actions in response to events in your workspace — for example, assigning an owner when a task enters review, or notifying someone when a deadline passes. It removes manual steps that do not require judgement.",
          },
          {
            q: "Do I need to write code to automate tasks?",
            a: "No. Rules are built from a trigger, an optional condition, and an action. There is no scripting step and no separate integration to host.",
          },
          {
            q: "How many automations can I run?",
            a: "It depends on your plan — Growth includes a monthly automation allowance and Pro runs unlimited automations. See the pricing page for the current numbers on each tier.",
          },
          {
            q: "Can automation update task status automatically?",
            a: "Yes. A status change is one of the available actions, so a rule can move a task into the next column when its conditions are met. Each run is recorded in the automation log.",
          },
          {
            q: "What happens if a rule misbehaves?",
            a: "Disable that rule; the log shows which rule fired and on which task, so you can identify the cause instead of guessing. Existing task data is not rolled back, so review and repair anything the rule changed.",
          },
        ]}
        internalLinks={[
          { label: "Task Management Software", href: "/features/tasks" },
          { label: "Kanban Board Software", href: "/features/kanban-board" },
          { label: "Team Inbox", href: "/features/inbox" },
          { label: "Reports & Dashboards", href: "/features/reports" },
          { label: "Integrations", href: "/features/integrations" },
          { label: "Pricing", href: "/pricing" },
        ]}
      />
    </SeoShell>
  );
}
