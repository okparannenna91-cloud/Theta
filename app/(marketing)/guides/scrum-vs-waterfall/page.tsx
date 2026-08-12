import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";

const BASE = "https://thetapm.site";

export const metadata: Metadata = {
  title: "Scrum vs Waterfall: Which Method Should Your Team Use? (2026)",
  description: "Scrum vs Waterfall compared on planning, flexibility, delivery, and team fit. Learn how to choose the right project method in 2026.",
  alternates: { canonical: `${BASE}/guides/scrum-vs-waterfall` },
  openGraph: {
    title: "Scrum vs Waterfall: Which Method Should Your Team Use? (2026)",
    description: "Compared on planning, flexibility, delivery, and team fit.",
    url: `${BASE}/guides/scrum-vs-waterfall`,
    siteName: "Theta PM",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Scrum vs Waterfall: Which Method Should Your Team Use? (2026)",
    description: "Plan everything, or adapt as you go?",
    creator: "@theta_pm",
  },
};

const pageSchema = [
  {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: "Scrum vs Waterfall: Which Method Should Your Team Use? (2026)",
    description: "Scrum vs Waterfall compared on planning, flexibility, delivery, and team fit.",
    author: { "@type": "Organization", name: "Theta PM Systems" },
    publisher: { "@type": "Organization", name: "Theta PM Systems" },
  },
];

export default function ScrumVsWaterfall() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Guides", "Scrum vs Waterfall"]}
        title="Scrum vs Waterfall: Which Method Should Your Team Use?"
        intro={[
          "Every team eventually hits the same fork in the road: plan everything up front, or figure it out as you go? That is the waterfall versus scrum decision in one sentence.",
          "Neither method is wrong. They answer different questions, fit different projects, and reward different habits. This guide explains what each one is, where they break down, and how to choose.",
        ]}
        sections={[
          {
            h2: "At a Glance",
            paragraphs: [
              "Here is the short version before we go deeper.",
            ],
            table: {
              headers: ["Dimension", "Waterfall", "Scrum"],
              rows: [
                ["Planning", "Everything up front", "Sprint by sprint"],
                ["Delivery", "One big release at the end", "Shipped increments every sprint"],
                ["Requirements", "Fixed and signed off early", "Evolve with feedback"],
                ["Team structure", "Specialists in phases", "Cross-functional teams"],
                ["Best for", "Stable, predictable projects", "Uncertain, fast-moving work"],
                ["Risk handling", "Risks known early, hard to recover", "Recovered fast, discovered late"],
              ],
            },
          },
          {
            h2: "What Is Waterfall?",
            paragraphs: [
              "Waterfall treats a project like a staircase: requirements, design, build, test, and launch — each step finishes before the next begins. Everything is planned up front, documented, and signed off.",
              "Its strength is predictability. With clear requirements and a stable scope, waterfall produces a plan, a budget, and a date that are actually reliable. That is why it still dominates construction, manufacturing, and regulated industries.",
            ],
            bullets: [
              "Clear phases with defined handoffs.",
              "Full documentation before work begins.",
              "Predictable cost and timeline when requirements are stable.",
            ],
          },
          {
            h2: "What Is Scrum?",
            paragraphs: [
              "Scrum is an agile method that replaces the staircase with a cycle: teams plan a short sprint (typically two weeks), build a small piece of usable work, review it, and plan the next sprint with what they learned.",
              "Its strength is adaptation. Because the team delivers every sprint, stakeholders see progress constantly and can change direction without throwing away months of work.",
            ],
            bullets: [
              "Time-boxed sprints with a clear goal.",
              "A backlog of work, prioritized sprint by sprint.",
              "Regular reviews that turn feedback into the next plan.",
            ],
            screenshot: "Screenshot: Theta PM kanban board with sprint columns and task priorities.",
          },
          {
            h2: "The Core Differences",
            h3s: [
              {
                heading: "Planning: everything vs enough",
                body: "Waterfall plans all phases up front; scrum plans only the next sprint in detail. If requirements can change, up-front planning becomes waste.",
              },
              {
                heading: "Delivery: one release vs many",
                body: "Waterfall delivers once, at the end. Scrum delivers usable work every sprint, which means value arrives sooner and risk shows up sooner — while there is still time to react.",
              },
              {
                heading: "Change: enemy vs fuel",
                body: "Waterfall treats change as a threat to the plan. Scrum treats change as information. Neither is wrong — it depends on whether change is likely.",
              },
            ],
          },
          {
            h2: "Where Waterfall Wins",
            bullets: [
              "Requirements are fixed and legally or contractually binding.",
              "The cost of change is genuinely enormous (construction, manufacturing).",
              "Regulators require documentation and sign-offs at each stage.",
              "The outcome is well understood — it is the execution that is hard.",
            ],
          },
          {
            h2: "Where Scrum Wins",
            bullets: [
              "The customer does not fully know what they need yet.",
              "The market rewards speed and constant improvement.",
              "Feedback from real users can reshape the product.",
              "The team is empowered to make decisions together.",
            ],
          },
          {
            h2: "Choosing: Three Questions That Decide",
            h3s: [
              {
                heading: "How stable are the requirements?",
                body: "If they will not change, waterfall's predictability wins. If they will, scrum's adaptability does.",
              },
              {
                heading: "How expensive is change?",
                body: "If a late change costs a fortune, waterfall. If it costs a sprint of effort, scrum.",
              },
              {
                heading: "When does the team start learning?",
                body: "Scrum learns from sprint one. Waterfall learns at the end. If learning early matters, scrum.",
              },
            ],
          },
          {
            h2: "You Can Also Do Both",
            paragraphs: [
              "Hybrid approaches are common: waterfall for scope, budget, and milestones, scrum inside each phase for execution. The plan stays predictable; the work stays adaptable. Theta PM supports both — a timeline with milestones for the plan, and kanban boards for the daily work, reading from the same tasks.",
            ],
          },
        ]}
        faqs={[
          {
            q: "What is the main difference between Scrum and Waterfall?",
            a: "Waterfall plans everything up front and delivers once at the end. Scrum plans in short sprints and delivers usable work every sprint, adapting as it learns.",
          },
          {
            q: "Which is better, Scrum or Waterfall?",
            a: "Neither is universally better. Waterfall fits stable, predictable projects where change is expensive; Scrum fits fast-moving work where feedback matters more than up-front certainty.",
          },
          {
            q: "Can you use Scrum and Waterfall together?",
            a: "Yes. Many teams plan milestones up front (waterfall style) and execute each phase in sprints (scrum style). A timeline for milestones plus a kanban board for sprints covers both.",
          },
          {
            q: "Why do teams fail with Waterfall?",
            a: "Waterfall fails when requirements change and the cost of change is high — months of planning and build become invalid. That is exactly the situation scrum handles well.",
          },
          {
            q: "Is Scrum good for small teams?",
            a: "Yes, and small teams can run lightweight scrum — a backlog, short sprints, and regular reviews — without heavy ceremony. A simple kanban board plus sprint columns is enough to start.",
          },
        ]}
        internalLinks={[
          { label: "What is Agile Project Management", href: "/guides/what-is-agile" },
          { label: "Kanban vs Scrum", href: "/guides/kanban-vs-scrum" },
          { label: "What is a Sprint in Scrum", href: "/guides/what-is-a-sprint" },
          { label: "Kanban Board Software", href: "/features/kanban-board" },
        ]}
        schema={pageSchema}
      />
    </SeoShell>
  );
}
