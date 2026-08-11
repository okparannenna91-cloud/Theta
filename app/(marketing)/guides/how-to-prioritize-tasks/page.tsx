import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";

const BASE = "https://thetapm.site";

export const metadata: Metadata = {
  title: "How to Prioritize Tasks: A Practical Step-by-Step Guide (2026)",
  description: "How to prioritize tasks in 2026 using the Eisenhower Matrix, MoSCoW, RICE, and ICE — plus a step-by-step process you can start using today.",
  alternates: { canonical: `${BASE}/guides/how-to-prioritize-tasks` },
  openGraph: {
    title: "How to Prioritize Tasks: A Practical Step-by-Step Guide (2026)",
    description: "Eisenhower, MoSCoW, RICE, and ICE explained — plus a simple process for deciding what to do first.",
    url: `${BASE}/guides/how-to-prioritize-tasks`,
    siteName: "Theta PM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "How to Prioritize Tasks: A Practical Step-by-Step Guide (2026)",
    description: "A simple process for deciding what to do first — Eisenhower, MoSCoW, RICE, and ICE.",
    creator: "@theta_pm",
  },
};

const pageSchema = [
  {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "How to Prioritize Tasks: A Practical Step-by-Step Guide (2026)",
    description: "A plain-English guide to prioritizing tasks using the Eisenhower Matrix, MoSCoW, RICE, and ICE, with a repeatable step-by-step process for any team.",
    author: { "@type": "Organization", name: "Theta PM Systems" },
    publisher: { "@type": "Organization", name: "Theta PM Systems" },
  },
];

export default function HowToPrioritizeTasks() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Guides", "How to Prioritize Tasks"]}
        title="How to Prioritize Tasks: A Practical Step-by-Step Guide"
        intro={[
          "Most to-do lists fail because everything on them feels urgent. When nothing has a rank, the loudest task wins — and the most important work quietly waits.",
          "This guide gives you a simple, repeatable way to prioritize tasks: a few proven methods, a step-by-step process, and tips for keeping priorities straight inside your project management tool.",
        ]}
        sections={[
          {
            h2: "Why Prioritization Fails",
            paragraphs: [
              "Prioritizing feels easy in theory and hard in practice. The trouble usually comes from one of a few habits:",
            ],
            bullets: [
              "Doing the easiest thing first, just to feel productive.",
              "Treating everything as urgent because nothing has a due date or owner.",
              "Letting the loudest request — not the most important — decide the order.",
              "Prioritizing once and never rechecking, even when the situation changes.",
              "Hiding priorities in email threads and chat instead of in the tool where the work lives.",
            ],
          },
          {
            h2: "The Main Prioritization Methods, Compared",
            paragraphs: [
              "There is no single right method. Each one suits a different situation. This table shows the difference at a glance.",
            ],
            table: {
              headers: ["Method", "Best for", "Effort", "When to skip it"],
              rows: [
                ["Eisenhower Matrix", "Deciding what to do today and what to drop", "Very low", "Large backlogs with many similar tasks"],
                ["MoSCoW", "Agreeing scope with a client or stakeholder", "Low", "Personal to-do lists"],
                ["RICE", "Scoring a big backlog of ideas or features", "Medium", "A handful of tasks on a busy day"],
                ["ICE", "Quick scoring when you have less data", "Low", "Long-term roadmaps that need careful scoring"],
              ],
            },
          },
          {
            h2: "Urgency vs Importance: The Eisenhower Matrix",
            paragraphs: [
              "The Eisenhower Matrix sorts tasks by two questions: Is it urgent? Is it important?",
              "Urgent means it has a tight deadline and demands attention now. Important means it moves your goals forward in a meaningful way. These are not the same thing, and mixing them up is the biggest mistake people make.",
            ],
            bullets: [
              "Urgent and important: do these first, today.",
              "Important but not urgent: schedule these. This is where the real progress lives.",
              "Urgent but not important: delegate them or do them fast and move on.",
              "Neither urgent nor important: drop them or park them.",
            ],
            screenshot: "Screenshot: A task board sorted by priority, with important-but-not-urgent work scheduled on the timeline.",
          },
          {
            h2: "MoSCoW: Must, Should, Could, Won't",
            paragraphs: [
              "MoSCoW ranks tasks into four buckets and is great for agreeing scope with a client, boss, or stakeholders. It forces a conversation about what is truly required.",
            ],
            bullets: [
              "Must have — the task is required; without it, the project is not done.",
              "Should have — important and wanted, but the project can ship without it.",
              "Could have — a nice-to-have that adds value when there is time.",
              "Won't have this time — explicitly out of scope, which protects the team.",
            ],
          },
          {
            h2: "RICE: Scoring Ideas With Numbers",
            paragraphs: [
              "RICE scores each task or idea so you can sort a long backlog with math instead of gut feel. Each task gets a score: (Reach x Impact x Confidence) / Effort.",
            ],
            bullets: [
              "Reach — how many people or projects are affected in a period of time.",
              "Impact — how much each person is affected, usually scored 1 to 3.",
              "Confidence — how sure you are about your reach and impact numbers, scored as a percentage.",
              "Effort — how many hours or person-days the task takes.",
            ],
          },
          {
            h2: "ICE: The Quick Scoring Option",
            paragraphs: [
              "ICE is RICE's lighter cousin for days when you want a number but not a research project. Score each task from 1 to 10 on Impact, Confidence, and Ease, then add or average the three.",
              "It is fast enough to run on twenty items in one sitting, which makes it a good fit for weekly reviews when the backlog has grown.",
            ],
            bullets: [
              "Impact — how big the payoff is.",
              "Confidence — how sure you are of the payoff.",
              "Ease — how easy the work is (higher is easier).",
              "Sort by total score, and start at the top.",
            ],
          },
          {
            h2: "A Simple Step-by-Step Process",
            paragraphs: [
              "Here is a process you can run today, without any training or templates.",
            ],
            bullets: [
              "Step 1. Write every open task down in one place. If it is not written down, it cannot be prioritized.",
              "Step 2. Mark each task urgent or important (Eisenhower). Do the urgent-and-important work first.",
              "Step 3. For anything left, pick a method: MoSCoW for scope talks, RICE for a big backlog, ICE for a quick weekly sort.",
              "Step 4. Assign each task an owner and a due date. Unassigned, undated tasks always drop to the bottom.",
              "Step 5. Move the top three tasks of the day to the front of your board. Three clear priorities beat a list of thirty.",
              "Step 6. Recheck at least once a week, because priorities change whether you look at them or not.",
            ],
            screenshot: "Screenshot: A task with custom fields for priority and score, sitting in a high-priority column on the kanban board.",
          },
          {
            h2: "Prioritizing Inside Your Task Tool",
            paragraphs: [
              "The method matters, but the tool decides whether you actually stick with it. If priorities live in your head or your inbox, they will fade. Keep them where the work happens.",
            ],
            bullets: [
              "Use columns for priority — a dedicated high-priority column makes the ranking visible to everyone.",
              "Track a priority custom field on every task, and filter or sort by it in seconds.",
              "Add a score field when you use RICE or ICE, so the math is recorded next to the work.",
              "Let the board, timeline, and calendar all show the same ranked tasks, so nobody has a different picture.",
              "Link related work with dependencies, so blocking tasks are easy to spot and reprioritize.",
            ],
            h3s: [
              {
                heading: "Example: a 15-minute weekly review in Theta PM",
                body: "Open the kanban board, sort by the priority field, and scan the top column. Ask: is this still the right top three? Are any high-priority tasks stuck without an owner or date? Adjust the columns and custom fields as needed — the whole team sees the same board in real time.",
              },
            ],
          },
        ]}
        faqs={[
          {
            q: "What is the best way to prioritize tasks?",
            a: "Write everything down, then sort by importance and urgency. Use the Eisenhower Matrix for daily decisions, and RICE or ICE when you need to score a larger backlog. Pick one method and stick to it for a few weeks before changing.",
          },
          {
            q: "What is the Eisenhower Matrix?",
            a: "It is a simple four-square grid that sorts tasks by two questions: is it urgent and is it important. Urgent-and-important work comes first, important-not-urgent work gets scheduled, urgent-not-important work is delegated, and the rest is dropped.",
          },
          {
            q: "What is the difference between urgent and important?",
            a: "Urgent means something demands attention right now because of a deadline or a fire. Important means it moves your goals forward. Most tasks feel urgent, but only some are important — and the important ones are usually what drive progress.",
          },
          {
            q: "When should I use MoSCoW instead of RICE?",
            a: "Use MoSCoW when you need to agree scope with stakeholders or a client, because the Must/Should/Could/Won't labels make trade-offs explicit. Use RICE when you have a big backlog of ideas and need a numeric ranking.",
          },
          {
            q: "How often should I review my priorities?",
            a: "At least once a week. Priorities shift as deadlines move and new work arrives, so a short weekly review keeps the ranking honest. Teams that ship fast often do a daily top-three check too.",
          },
        ]}
        internalLinks={[
          { label: "Task Management Software", href: "/features/tasks" },
          { label: "Task Management Best Practices", href: "/guides/task-management-best-practices" },
          { label: "Prioritization Frameworks", href: "/guides/prioritization-frameworks" },
          { label: "Kanban Board Software", href: "/features/kanban-board" },
        ]}
        schema={pageSchema}
      />
    </SeoShell>
  );
}
