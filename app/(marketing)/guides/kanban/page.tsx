import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";

const BASE = "https://thetapm.site";

export const metadata: Metadata = {
  title: "How to Use Kanban Boards: A Practical Guide (2026)",
  description: "Learn how to use kanban boards the right way: visualize work, set up columns, limit work in progress, and keep flow healthy. Practical guide with examples.",
  alternates: { canonical: `${BASE}/guides/kanban` },
  openGraph: {
    title: "How to Use Kanban Boards: A Practical Guide (2026)",
    description: "Visualize work, set up columns, limit WIP, and keep flow healthy.",
    url: `${BASE}/guides/kanban`,
    siteName: "Theta PM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "How to Use Kanban Boards: A Practical Guide (2026)",
    description: "The practical kanban guide.",
    creator: "@theta_pm",
  },
};

const pageSchema = [
  {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name: "How to Use Kanban Boards (2026)",
    description: "A practical guide to using kanban boards: visualize work, set up columns, limit work in progress, and keep flow healthy.",
    step: [
      { "@type": "HowToStep", name: "Visualize your workflow", text: "Turn every stage of your work into a column." },
      { "@type": "HowToStep", name: "Create cards for work items", text: "Add a card for every task, with the owner and due date." },
      { "@type": "HowToStep", name: "Limit work in progress", text: "Set a WIP limit per column to prevent overload." },
      { "@type": "HowToStep", name: "Move cards as work progresses", text: "Keep cards moving and review blockers daily." },
    ],
  },
];

export default function KanbanGuide() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Guides", "Kanban"]}
        title="How to Use Kanban Boards: A Practical Guide (2026)"
        intro={[
          "Kanban boards are one of the simplest ways to manage work — a few columns, a stack of cards, and a set of rules you can explain in two minutes. Yet most teams get less out of them than they could, because they copy a generic template without matching it to their own workflow.",
          "This guide walks through how to set up a kanban board that actually reflects how your team works, how to limit work in progress, and how to keep work flowing without constant meetings.",
        ]}
        sections={[
          {
            h2: "What Is a Kanban Board?",
            paragraphs: [
              "A kanban board is a visual representation of your workflow. Work items are cards that move from left to right through columns, each column standing for a stage of work. The board makes three things visible at a glance: what is being worked on, where each item is, and where work is getting stuck.",
            ],
            bullets: [
              "Columns represent stages — for example, To Do, In Progress, Review, Done.",
              "Cards represent individual work items, with an owner and a due date.",
              "Cards move left to right as work advances.",
              "A board can represent a team, a project, or a personal workflow.",
            ],
          },
          {
            h2: "Core Kanban Principles",
            h3s: [
              {
                heading: "Visualize your work",
                body: "Every stage of your workflow becomes a column. If a step happens but has no column, add one. The board should mirror reality, not an ideal you hope to have someday.",
              },
              {
                heading: "Limit work in progress",
                body: "A WIP limit caps how many cards can sit in a column at once. This is the principle that makes kanban work: it surfaces bottlenecks and forces the team to finish work before starting more.",
              },
              {
                heading: "Manage flow",
                body: "Watch how fast cards move across the board. When cards pile up in one column, that is a bottleneck — and now you can see it and fix it instead of guessing.",
              },
              {
                heading: "Make rules explicit",
                body: "Define what 'In Review' means and who moves a card to Done. Clear rules prevent the board from becoming decoration.",
              },
            ],
          },
          {
            h2: "How to Set Up Your First Kanban Board",
            paragraphs: [
              "Start small. A board with too many columns fails as fast as a board with too few.",
            ],
            bullets: [
              "Start with four columns: To Do, In Progress, Review, Done.",
              "Add columns only for stages your team actually performs today.",
              "Put every active work item on a card with an owner and a due date.",
              "Set a WIP limit on In Progress (usually 2–3 per person).",
              "Pick a tool where cards are easy to move — you will move them dozens of times a day.",
            ],
            screenshot: "Screenshot: A kanban board with To Do, In Progress, Review, and Done columns.",
          },
          {
            h2: "Kanban Examples for Different Teams",
            h3s: [
              {
                heading: "Software development",
                body: "Columns like Backlog, Ready, In Progress, In Review, Testing, Done. WIP limits keep developers from starting five tasks at once, and GitHub issues can sync straight onto cards.",
              },
              {
                heading: "Marketing",
                body: "Columns like Ideas, In Production, In Review, Published. Add a calendar view for launch dates so the board and the schedule stay connected.",
              },
              {
                heading: "Personal task management",
                body: "Columns like Today, This Week, Waiting On, Done. Personal boards work best with a strict WIP limit of one or two.",
              },
            ],
          },
          {
            h2: "Common Kanban Mistakes",
            bullets: [
              "Too many columns — every stage you add increases overhead. Start minimal.",
              "No WIP limits — without them, the board shows a pile of started work instead of flow.",
              "Cards without owners or dates — the board becomes a wish list.",
              "Moving cards only in weekly meetings — the board should be updated in real time.",
              "Mixing projects on one board without labels — you lose the ability to see progress per project.",
            ],
          },
          {
            h2: "Kanban in Project Management Software",
            paragraphs: [
              "A digital kanban board is more than a whiteboard with columns. The best tools let you attach details, comments, and due dates to cards, add custom fields, automate column moves, and show the same work as a timeline or calendar.",
              "Theta PM keeps the same tasks visible as kanban, timeline, and Gantt views, so teams that plan with schedules can use the board for daily work without maintaining two systems.",
            ],
          },
        ]}
        faqs={[
          {
            q: "What are the basic kanban board columns?",
            a: "The classic setup is To Do, In Progress, and Done. Most teams add a Review column between In Progress and Done. Only add columns for stages your team actually performs.",
          },
          {
            q: "What is a WIP limit in kanban?",
            a: "A work-in-progress limit caps the number of cards allowed in a column at one time. It forces the team to finish existing work before starting new work, which reduces context switching and surfaces bottlenecks.",
          },
          {
            q: "Can I use kanban for personal productivity?",
            a: "Yes. A personal kanban with columns like Today, This Week, Waiting On, and Done is a great way to limit how many things you start each day.",
          },
          {
            q: "What is the difference between kanban and a simple to-do list?",
            a: "A to-do list shows what needs doing. A kanban board shows what is in progress, who owns it, and where it is stuck. That visibility is what makes kanban powerful for teams.",
          },
          {
            q: "Which tools support kanban boards?",
            a: "Most project management platforms include kanban boards. Theta PM, Trello, Asana, and Monday.com all support them. Theta PM and Asana also let you view the same work as a timeline or calendar.",
          },
        ]}
        internalLinks={[
          { label: "Kanban vs Scrum vs Agile", href: "/guides/kanban-vs-scrum-vs-agile" },
          { label: "Kanban Board Software", href: "/features/kanban-board" },
          { label: "Kanban vs Scrum", href: "/guides/kanban-vs-scrum" },
          { label: "Task Management Software", href: "/features/tasks" },
          { label: "Best Project Management Software 2026", href: "/project-management-software" },
        ]}
        schema={pageSchema}
      />
    </SeoShell>
  );
}
