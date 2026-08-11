import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";

const BASE = "https://thetapm.site";

export const metadata: Metadata = {
  title: "What Is Agile Project Management? A Beginner's Guide (2026)",
  description: "What is agile project management, explained for beginners in 2026. Learn the agile values, how it works in practice, and the frameworks teams use to deliver work faster.",
  alternates: { canonical: `${BASE}/guides/what-is-agile` },
  openGraph: {
    title: "What Is Agile Project Management? A Beginner's Guide (2026)",
    description: "The agile values, how it works in practice, and the frameworks teams use.",
    url: `${BASE}/guides/what-is-agile`,
    siteName: "Theta PM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "What Is Agile Project Management? A Beginner's Guide (2026)",
    description: "The agile values, how it works in practice, and the frameworks teams use.",
    creator: "@theta_pm",
  },
};

const pageSchema = [
  {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "What Is Agile Project Management? A Beginner's Guide (2026)",
    description: "A beginner-friendly introduction to agile project management: the four values, how agile works in practice, and the frameworks teams use to deliver in small increments.",
    author: { "@type": "Organization", name: "Theta PM Systems" },
    publisher: { "@type": "Organization", name: "Theta PM Systems" },
  },
];

export default function WhatIsAgile() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Guides", "What is Agile Project Management"]}
        title="What Is Agile Project Management?"
        intro={[
          "Agile project management is a way of planning and doing work in small pieces, then improving as you go. Instead of writing one giant plan and hoping it works out, agile teams deliver something small, get feedback, and adjust.",
          "It sounds simple, but it is a real shift in how teams think. This guide explains what agile means, where it came from, how it works day to day, and the frameworks that put it into practice.",
        ]}
        sections={[
          {
            h2: "What Does 'Agile' Mean?",
            paragraphs: [
              "The word 'agile' means being able to move quickly and easily. In project management, it describes an approach where teams deliver work in small, regular pieces instead of all at once at the end.",
              "Agile started in software development in 2001, when a group of developers wrote the Agile Manifesto. Its core is four short value statements, but together they changed how entire industries work. The four values are:",
            ],
            bullets: [
              "Individuals and interactions over processes and tools.",
              "Working software over heavy documentation.",
              "Customer collaboration over contract negotiation.",
              "Responding to change over following a plan.",
            ],
            h3s: [
              {
                heading: "What the values mean in practice",
                body: "The point is not that tools, documents, and plans are bad. They are fine — but they should never get in the way of people, real progress, talking to customers, and adapting. When those two things clash, agile teams choose people, working results, and change.",
              },
            ],
          },
          {
            h2: "The 12 Agile Principles",
            paragraphs: [
              "Below the four values sit twelve principles. You do not need to memorize all of them, but a few carry most of the weight in daily work:",
            ],
            bullets: [
              "Deliver working pieces often — every couple of weeks is better than a big reveal at the end.",
              "Welcome changing requirements, even late in the project. Change is a competitive advantage.",
              "The best way to share information is face to face conversation.",
              "Working results are the main measure of progress.",
              "The team should reflect regularly and tune how it works.",
              "Keep the process simple — do as much as you need, no more.",
            ],
          },
          {
            h2: "How Agile Works in Practice",
            paragraphs: [
              "Agile is a mindset, but it shows up as a rhythm of habits. A typical agile team works in short cycles, keeps a visible backlog of work, and checks in constantly.",
            ],
            bullets: [
              "Break the work into small chunks called user stories or tasks.",
              "Keep a prioritized backlog — the list of everything waiting to be done.",
              "Pick a small batch to work on in the next cycle (a sprint).",
              "Hold short daily check-ins so everyone knows what is happening.",
              "Show completed work, gather feedback, and decide what to do next.",
            ],
            screenshot: "Screenshot: An agile project overview showing a backlog, an active sprint, and progress at a glance.",
          },
          {
            h2: "Agile Frameworks: Scrum, Kanban, and Hybrids",
            paragraphs: [
              "Agile does not tell you exactly how to run your team. For that, you use a framework — a set of roles and rules built on agile thinking. The two you will hear most are Scrum and Kanban.",
            ],
            h3s: [
              {
                heading: "Scrum",
                body: "Scrum organizes work into fixed-length sprints (usually two to four weeks). It has defined roles — Product Owner, Scrum Master, and the team — plus ceremonies like sprint planning, daily standups, reviews, and retrospectives.",
              },
              {
                heading: "Kanban",
                body: "Kanban skips sprints and roles entirely. Work flows continuously through a visual board with columns, and WIP limits keep the team from taking on too much. It is the most flexible agile framework.",
              },
              {
                heading: "Hybrid approaches",
                body: "A common mix is Scrum's planning plus Kanban's board — people call it Scrumban. You can also blend agile with parts of traditional planning if that suits your project.",
              },
            ],
          },
          {
            h2: "Is Agile Right for Your Team?",
            paragraphs: [
              "Agile works best when requirements are unclear, change often, or you want feedback as you go. It works less well when the scope is fixed by contract and the work is strictly predictable.",
            ],
            bullets: [
              "Great for: software teams, product teams, marketing campaigns, anything where the answer improves with feedback.",
              "Harder for: projects with a fixed deadline and a fixed, detailed spec where the customer cannot review along the way.",
              "Not a cure-all: agile does not fix unclear goals or a team that does not communicate. It just makes problems visible sooner.",
            ],
          },
          {
            h2: "Tools for Agile Teams",
            paragraphs: [
              "A good agile tool keeps the whole workflow visible: the backlog, the work in progress, and what just shipped. Boards and timelines are the two views most agile teams live in.",
              "Theta PM shows the same tasks as a kanban board, a timeline with milestones, a Gantt view for dependencies, and a calendar for deadlines — so the whole team can work the way that fits the day, on the same set of tasks.",
            ],
            screenshot: "Screenshot: An agile workflow with a kanban board and a milestone timeline in one workspace.",
          },
        ]}
        faqs={[
          {
            q: "What is agile project management in simple terms?",
            a: "It is a way of managing work in small pieces, delivering often, and adapting as you learn. Teams pick a small batch of work, finish it, get feedback, and adjust before moving to the next batch.",
          },
          {
            q: "What is the difference between agile and waterfall?",
            a: "Waterfall plans everything up front and delivers once at the end. Agile delivers in small increments and changes the plan as you go. Agile suits uncertain work; waterfall suits fixed, predictable projects.",
          },
          {
            q: "Is Scrum the same as agile?",
            a: "No. Agile is the philosophy, and Scrum is one framework that puts it into practice. Kanban is another. You can be agile without Scrum, and teams can use agile ideas without any framework at all.",
          },
          {
            q: "Do I need to be a software company to use agile?",
            a: "No. Agile started in software, but marketing, HR, operations, and product teams all use it. The core ideas — small batches, feedback, adapting — work for almost any kind of project.",
          },
          {
            q: "What are the most important agile principles for a beginner?",
            a: "Start with three: deliver working pieces often, welcome change instead of fighting it, and reflect regularly on how the team works so it keeps improving.",
          },
        ]}
        internalLinks={[
          { label: "Kanban Guide", href: "/guides/kanban" },
          { label: "Kanban vs Scrum", href: "/guides/kanban-vs-scrum" },
          { label: "Scrum vs Waterfall", href: "/guides/scrum-vs-waterfall" },
          { label: "Kanban Board Software", href: "/features/kanban-board" },
        ]}
        schema={pageSchema}
      />
    </SeoShell>
  );
}
