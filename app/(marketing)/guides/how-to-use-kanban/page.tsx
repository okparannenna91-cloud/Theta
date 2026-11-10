import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "How to Use Kanban: A Step-by-Step Guide for Teams",
  description:
    "Learn how to use kanban properly: design your columns, set WIP limits, write cards that move, run the daily pull, and measure cycle time to improve flow.",
  path: "/guides/how-to-use-kanban",
});

const pageSchema = [
  {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Use Kanban",
    description:
      "A step-by-step guide to setting up and running a kanban board: columns, WIP limits, cards, pull policy, and flow metrics.",
    step: [
      { "@type": "HowToStep", name: "Map your real workflow" },
      { "@type": "HowToStep", name: "Write cards as deliverables" },
      { "@type": "HowToStep", name: "Set WIP limits" },
      { "@type": "HowToStep", name: "Define what done means in each column" },
      { "@type": "HowToStep", name: "Run the daily pull" },
      { "@type": "HowToStep", name: "Measure cycle time and improve" },
    ],
  },
];

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Guides", "How to Use Kanban"]}
        title="How to Use Kanban: A Step-by-Step Guide"
        intro={[
          "Kanban looks like the easiest method in project management: three columns, some cards, move them right. That is also why most kanban boards stop working after a month — the columns are decoration, nobody enforces a limit, and the board becomes a picture of the backlog rather than a picture of the work.",
          "Used properly, kanban is a flow system. It limits how much work is in progress, makes blockers visible, and produces two numbers that tell you whether you are getting faster. This guide walks through setting it up from scratch.",
        ]}
        sections={[
          {
            h2: "Step 1: Map the Workflow You Actually Have",
            paragraphs: [
              "Do not start from a tutorial's columns. Start from what literally happens to a piece of work between the moment someone asks for it and the moment it ships.",
              "Ask the team to describe one recent finished item out loud. Write down each handoff as a stage: requested, specified, designed, built, reviewed, tested, deployed. Then delete the stages nobody ever waits in. A board with four honest columns beats a board with nine aspirational ones.",
            ],
            bullets: [
              "\"To Do\", \"In Progress\", and \"Done\" is a valid starting point — it is not a compromise.",
              "Add a column only for a stage where work genuinely waits or changes hands.",
              "Name columns after states of the work, not after people or teams.",
              "Keep \"Done\" to a bounded recent window; archive older completed work so the column does not grow forever.",
            ],
          },
          {
            h2: "Step 2: Write Cards That Can Move",
            paragraphs: [
              "A card is a unit of work that one person can finish without coordinating a meeting. \"Improve onboarding\" will sit in the same column for six weeks. \"Rewrite the sign-up confirmation email\" will move.",
              "A useful card carries four things: a concrete outcome, an owner, a done definition, and a date if a date genuinely exists. Everything else — the discussion, the linked pull request, the design file — attaches to the card instead of living in a chat thread.",
            ],
            bullets: [
              "Title the outcome, not the activity: \"Ship CSV export\" beats \"Work on export\".",
              "One owner per card. Shared ownership means nobody is accountable.",
              "Attach the artefact — pull request, design link, spec — to the card so the next person does not have to ask.",
              "Split anything that has not moved in two weeks; it is either blocked or too big.",
            ],
          },
          {
            h2: "Step 3: Set WIP Limits",
            paragraphs: [
              "This is the step teams skip, and it is the step that makes kanban work. A work-in-progress limit caps how many cards may sit in a column at once. When the column is full, the team finishes something before starting something.",
              "Start one card below your current average per person per column. If three developers routinely have four things in progress, set the limit to three. You are not banning multitasking; you are making its cost visible.",
            ],
            bullets: [
              "Set limits per column, not per person — the constraint is the team's flow, not an individual's.",
              "A full column is a signal to help finish, not a reason to widen the limit.",
              "Review limits monthly; they should rise only when the team is genuinely faster.",
              "WIP limits plus a visible blocker column are what separate kanban from a to-do list.",
            ],
          },
          {
            h2: "Step 4: Define What Done Means in Each Column",
            paragraphs: [
              "Every column needs an exit rule both the author and reviewer agree on. Without one, \"In Review\" becomes the place work goes to be forgotten.",
            ],
            table: {
              headers: ["Column", "Entry rule", "Exit rule"],
              rows: [
                ["To Do", "Someone has described the outcome and it is prioritized", "An owner has started work on it"],
                ["In Progress", "An owner is actively working on it", "The artefact exists and is ready for a second pair of eyes"],
                ["In Review", "A reviewer is assigned", "Approved, or sent back with written feedback"],
                ["Blocked", "Something outside the team's control is stopping it", "The blocker is removed and the card returns to its column"],
                ["Done", "It meets the definition of done and is deployed or delivered", "Archived after the review window"],
              ],
            },
          },
          {
            h2: "Step 5: Run the Daily Pull, Not a Status Meeting",
            paragraphs: [
              "The daily conversation on a kanban team is about flow, not about reporting to a manager. Walk the board right to left, starting at Done: what finished, what is in review, who is blocked, and what can be pulled next.",
              "Right-to-left matters. It focuses the team on finishing rather than starting, which is the entire point of a WIP limit. Fifteen minutes, standing, at the board — and anyone not needed for a specific card is free to leave.",
            ],
            bullets: [
              "Finished since yesterday — and does it meet the column's exit rule?",
              "In review — who is reviewing, and by when?",
              "Blocked — what is the specific blocker and who owns removing it?",
              "Pull — what is the next card, given the WIP limit?",
            ],
          },
          {
            h2: "Step 6: Measure Two Numbers",
            paragraphs: [
              "Kanban improves through measurement, and two metrics carry most of the signal.",
              "Cycle time is how long a card takes from start to finish. Lead time is how long it takes from request to delivery. Both are medians, not averages — one six-week outlier will distort a mean and hide a real improvement.",
              "If you chart cycle time over a few weeks you get a cumulative flow picture: where cards pile up, which column is the bottleneck, and whether a WIP limit change actually helped.",
            ],
            bullets: [
              "Track cycle time per card from first pull to Done, using real start and completion timestamps.",
              "Watch the median and the 85th percentile — the tail is what breaks commitments.",
              "If one column consistently holds the most cards, that is your constraint. Fix it there, not everywhere.",
              "Compare before and after any process change; otherwise you are guessing.",
            ],
          },
          {
            h2: "Common Mistakes",
            bullets: [
              "Using the board as a backlog dump, so nothing ever leaves To Do and everything feels late.",
              "No WIP limit, which turns kanban into a list of everything in flight at once.",
              "Columns that mirror org chart roles instead of states of work, which forces handoffs that do not exist.",
              "Moving a card to Done before it is actually delivered, which poisons every later metric.",
              "Card titles that describe activity, so nothing can be verified as finished.",
              "Rewriting the board every quarter instead of tuning one constraint at a time.",
            ],
          },
          {
            h2: "Running Kanban in Theta PM",
            paragraphs: [
              "Theta PM's kanban board is one view of the tasks in a project, so the same cards appear on the timeline, the calendar, and the Gantt view without being copied. That makes the board a flow tool rather than a separate system.",
            ],
            bullets: [
              "Drag cards between columns, or let automation move them on status change.",
              "Custom fields on the card hold size, priority, or client without a separate spreadsheet.",
              "Task completion timestamps feed the reports view, so cycle time is measured rather than estimated.",
              "Milestones on the timeline show which cards belong to the same release.",
              "GitHub and Slack integrations keep the card aligned with the pull request and the channel.",
            ],
          },
        ]}
        faqs={[
          {
            q: "How many columns should a kanban board have?",
            a: "Start with three: To Do, In Progress, and Done. Add a column only when work genuinely waits or changes hands at that stage. Most teams land between four and six; anything beyond that is usually a workflow nobody follows.",
          },
          {
            q: "What is a WIP limit, and is it required?",
            a: "A WIP limit caps how many cards may be in a column at once. It is not optional in practice — without one, kanban degenerates into a to-do list and the board stops reflecting capacity. Start one below your current average and tune from there.",
          },
          {
            q: "What is the difference between kanban and scrum?",
            a: "Kanban is continuous: work flows through columns with no fixed iterations, and the constraint is a WIP limit. Scrum is time-boxed: work is planned into a sprint, committed to, and reviewed at the end. Kanban suits interrupt-driven and support work; scrum suits planned product development.",
          },
          {
            q: "How do I measure whether kanban is working?",
            a: "Track cycle time from first pull to Done and watch the median. If it falls while WIP limits hold, flow is improving. If one column consistently holds the most cards, that column is your bottleneck and the next thing to fix.",
          },
          {
            q: "Can I use kanban for a team that also runs sprints?",
            a: "Yes. Many teams run a kanban board for continuous operational work and sprints for planned product work. Theta PM supports sprints and boards on the same tasks, so the two views stay consistent.",
          },
        ]}
        internalLinks={[
          { label: "Kanban Guide", href: "/guides/kanban" },
          { label: "Kanban vs Scrum", href: "/guides/kanban-vs-scrum" },
          { label: "Kanban Board Software", href: "/features/kanban-board" },
          { label: "What is a Sprint in Scrum?", href: "/guides/what-is-a-sprint" },
          { label: "How to Prioritize Tasks", href: "/guides/how-to-prioritize-tasks" },
          { label: "Pricing", href: "/pricing" },
        ]}
        schema={pageSchema}
      />
    </SeoShell>
  );
}
