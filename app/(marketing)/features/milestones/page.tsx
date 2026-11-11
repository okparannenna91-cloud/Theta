import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Project Milestones: Track Checkpoints, Not Just Tasks",
  description:
    "Milestones mark the checkpoints that matter and surface on the timeline and Gantt. See how linked tasks drive milestone progress and how to set useful ones.",
  path: "/features/milestones",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Features", "Milestones"]}
        title="Project Milestones That Mean Something"
        intro={[
          "A milestone is a checkpoint you would defend in a stakeholder meeting: beta ready, migration complete, launch live. Done means done — not 80% of the tasks closed.",
          "That is why a milestone needs a date, an owner, and a set of linked tasks. Without them it is a coloured label; with them it becomes a progress instrument that appears on the timeline and the Gantt chart.",
        ]}
        sections={[
          {
            h2: "What a Milestone Holds",
            paragraphs: [
              "Theta PM milestones carry the information needed to decide whether a checkpoint is actually on track, rather than just whether it exists.",
            ],
            bullets: [
              "A due date, so the checkpoint appears on the timeline and Gantt rather than in a document.",
              "An owner, so there is one person accountable for reaching it.",
              "Linked tasks, so progress reflects the work in front of the date.",
              "A status, so the milestone can move from planned to reached instead of being deleted.",
              "A colour and description, so a portfolio view reads at a glance.",
            ],
          },
          {
            h2: "Progress From the Work Beneath It",
            paragraphs: [
              "A milestone with no linked tasks can only be closed by assertion. Linking the tasks that constitute the checkpoint means progress is derived from real status — when the last linked task is done, the milestone is genuinely complete, and until then no one has to remember to say otherwise.",
            ],
            table: {
              headers: ["Milestone style", "How completion is known"],
              rows: [
                ["Label with a date", "Someone remembers to tick it"],
                ["Label plus linked tasks", "Derived from the tasks that compose it"],
                ["Linked tasks plus an owner", "Derived, and somebody is accountable for the date"],
              ],
            },
          },
          {
            h2: "Milestones on the Timeline and Gantt",
            paragraphs: [
              "Milestones mark the points a schedule is organised around. On the timeline they show what the project is counting down to; on the Gantt chart they show where the sequence has to land, which is what makes a dependency chain legible — you can see whether the work actually leads to the checkpoint or merely runs in the same direction.",
            ],
          },
          {
            h2: "Choosing Milestones Worth Tracking",
            paragraphs: [
              "Most projects have three to seven real checkpoints. More than that and the milestones become a second task list, which defeats the purpose.",
            ],
            bullets: [
              "Pick points where a decision gets made or something ships — not internal percentages.",
              "Give each milestone a date you would communicate externally; if the date does not matter, it is a task.",
              "Tie the last milestone to the definition of done for the project, not to 'most tasks complete'.",
              "Review milestones in the weekly cycle alongside the work, so slippage is caught before the checkpoint, not at it.",
            ],
          },
          {
            h2: "Milestones as an Early Warning",
            paragraphs: [
              "The value of a dated checkpoint is that it fails early. When a milestone's linked tasks are not moving and the date is two weeks out, the conversation happens while there is still room to change scope. That is a different conversation from the one you have on launch day.",
            ],
          },
        ]}
        faqs={[
          {
            q: "What is a project milestone?",
            a: "A milestone is a significant checkpoint in a project — a date by which something specific must be true, such as a beta being ready or a migration completing. It is used to track progress at a level above individual tasks.",
          },
          {
            q: "How is a milestone different from a task?",
            a: "A task is work with a duration. A milestone is a point in time and usually has no duration of its own; its progress comes from the tasks linked to it. You finish tasks; you reach milestones.",
          },
          {
            q: "Do milestones appear on the timeline and Gantt chart?",
            a: "Yes. Milestones are placed on the timeline by their due date and appear on the Gantt chart, so checkpoints are visible in the schedule rather than only in a list.",
          },
          {
            q: "How many milestones should a project have?",
            a: "Usually three to seven. Each one should mark a decision or a delivery. More than that and milestones duplicate the task list, which makes them easy to ignore.",
          },
          {
            q: "Can I link tasks to a milestone?",
            a: "Yes. Linked tasks are what make a milestone measurable — progress reflects the status of the work underneath it instead of a manual tick.",
          },
        ]}
        internalLinks={[
          { label: "Timeline View", href: "/features/timeline" },
          { label: "Gantt Chart Software", href: "/features/gantt" },
          { label: "Project Calendar", href: "/features/calendar" },
          { label: "Project Planning Software", href: "/features/project-planning" },
          { label: "What is a Gantt Chart", href: "/guides/what-is-a-gantt-chart" },
          { label: "Pricing", href: "/pricing" },
        ]}
      />
    </SeoShell>
  );
}
