import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";

const BASE = "https://thetapm.site";

export const metadata: Metadata = {
  title: "Kanban Board Software: Plan, Track, and Ship (2026)",
  description: "Kanban board software for teams that want a clear view of work: drag-and-drop cards, custom fields, automations, and real-time collaboration — plus timeline and Gantt views on the same tasks.",
  alternates: { canonical: `${BASE}/features/kanban-board` },
  openGraph: {
    title: "Kanban Board Software: Plan, Track, and Ship (2026)",
    description: "Boards, custom fields, automations, and real-time collaboration.",
    url: `${BASE}/features/kanban-board`,
    siteName: "Theta PM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Kanban Board Software: Plan, Track, and Ship (2026)",
    description: "Boards, custom fields, automations, and real-time collaboration.",
    creator: "@theta_pm",
  },
};

const pageSchema = [
  {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Theta PM Kanban Board Software",
    applicationCategory: "ProjectManagementApplication",
    operatingSystem: "Web",
    description: "Kanban boards with custom fields, automations, and real-time collaboration.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  },
];

export default function KanbanBoardFeature() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Features", "Kanban Board"]}
        title="Kanban Board Software That Shows Work Clearly (2026)"
        intro={[
          "A kanban board is the fastest way to see what the team is working on, what is about to finish, and where work is getting stuck. Theta PM turns that simple idea into your team's operating system — with cards that carry real task data, columns you can shape to your workflow, and automations that do the boring parts.",
        ]}
        sections={[
          {
            h2: "What You Get With Theta PM Kanban Boards",
            bullets: [
              "Drag-and-drop cards that move between columns instantly.",
              "Custom fields on cards — priority, estimate, category, anything your team tracks.",
              "Assignees and due dates on every card.",
              "Automations that move cards, assign work, and notify the right people.",
              "Real-time updates, so every teammate sees the board change as it happens.",
            ],
            screenshot: "Screenshot: Theta PM kanban board with cards showing assignees, due dates, and custom fields.",
          },
          {
            h2: "Columns That Match Your Workflow",
            paragraphs: [
              "Most boards start with To Do, In Progress, and Done — but your team's workflow is probably more specific. Add a Review column, a Testing column, or a Waiting On column. Theta PM boards adapt to the way you actually work, instead of forcing you into a template.",
              "You can also shape the board per project, so a support queue, a product build, and a marketing campaign each get a board that reflects their own stages.",
            ],
          },
          {
            h2: "Cards That Are More Than Stickers",
            paragraphs: [
              "A digital card is only useful if it carries the context the team needs. In Theta PM, every card opens a task with the full picture: description, comments, custom fields, assignees, and due dates.",
            ],
            bullets: [
              "Comments and mentions keep discussion attached to the work, not scattered across chat.",
              "Custom fields surface the data your team filters on — priority, type, effort.",
              "Activity on the card is logged, so there is always a clear history.",
            ],
          },
          {
            h2: "Automate Repetitive Board Work",
            paragraphs: [
              "The most common kanban chore is moving cards when a status changes. Theta PM automations handle that for you — move a card, assign it, notify the team, or update a field automatically when a rule triggers.",
              "Example: when a task is moved to In Review, notify the reviewer; when it moves to Done, notify the project owner. Rules like these remove the 'did you update the board?' conversations.",
            ],
          },
          {
            h2: "From Board to Timeline Without Duplication",
            paragraphs: [
              "The same tasks that live on your kanban board are available as a timeline and Gantt view. Plan the schedule on the timeline, run the daily work on the board — one source of truth, no re-entering tasks.",
              "This is the difference between a kanban tool and a project management platform: the board is one view of the work, not the only view.",
            ],
          },
          {
            h2: "Kanban for Every Team",
            h3s: [
              {
                heading: "Software teams",
                body: "Link GitHub repositories to projects and sync issues onto the board, so the backlog lives where the code lives.",
              },
              {
                heading: "Marketing teams",
                body: "Run campaigns through Content, In Review, and Published columns, with the calendar view for launch dates.",
              },
              {
                heading: "Operations teams",
                body: "Use WIP limits to stop overload, and let automations route requests to the right owner.",
              },
            ],
          },
        ]}
        faqs={[
          {
            q: "Is Theta PM a good Trello alternative?",
            a: "Yes. Theta PM has the same drag-and-drop board experience as Trello, plus custom fields, automations, and timeline and Gantt views that Trello lacks. Teams that outgrow Trello's board-only model often move to Theta PM.",
          },
          {
            q: "Can I add custom fields to kanban cards?",
            a: "Yes. Custom fields let you track priority, estimates, category, and any other data your team needs — and they show directly on the cards.",
          },
          {
            q: "Can I see the same work as a timeline or Gantt?",
            a: "Yes. Kanban, timeline, and Gantt are views of the same tasks. Plan on the timeline, work on the board — without entering tasks twice.",
          },
          {
            q: "Does Theta PM automate board workflows?",
            a: "Yes. Automations can move cards between columns, assign tasks, and notify people based on rules you set, like moving a card to In Review.",
          },
          {
            q: "Is there a free kanban board plan?",
            a: "Yes. Theta PM's free tier covers a small team of up to five members with unlimited tasks, plus boards, timelines, and calendar views.",
          },
        ]}
        internalLinks={[
          { label: "Kanban Guide", href: "/guides/kanban" },
          { label: "Kanban vs Scrum vs Agile", href: "/guides/kanban-vs-scrum-vs-agile" },
          { label: "Task Management Software", href: "/features/tasks" },
          { label: "Gantt Chart Software", href: "/features/gantt" },
          { label: "Team Collaboration Software", href: "/features/collaboration" },
          { label: "Best Project Management Software 2026", href: "/project-management-software" },
          { label: "Pricing", href: "/pricing" },
        ]}
        schema={pageSchema}
      />
    </SeoShell>
  );
}
