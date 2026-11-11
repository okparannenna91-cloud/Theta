import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Project Management Resources and Guides",
  description:
    "Explore Theta PM resources: practical guides on Kanban, Agile, sprints, prioritization, risk, goals, and choosing project management software.",
  path: "/resources",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Resources"]}
        title="Project Management Resources"
        intro={[
          "This page collects the learning resources available on Theta PM — guides that explain common project management methods, decisions, and workflows in plain language.",
          "Use these resources to choose an approach that fits your team, understand the trade-offs behind it, and map that approach to concrete features like boards, timelines, milestones, and automation in Theta PM.",
        ]}
        sections={[
          {
            h2: "Workflow and Method Guides",
            paragraphs: [
              "If you are deciding how work should flow through your team, start with the workflow guides. They compare common frameworks and explain when each one is a good fit.",
            ],
            bullets: [
              "Kanban basics and how to run a Kanban board day to day.",
              "Kanban vs Scrum, Kanban vs Scrum vs Agile, and Scrum vs Waterfall comparisons.",
              "Agile methodology and project management framework overviews.",
              "What a sprint is and how sprint-based planning differs from continuous flow.",
            ],
          },
          {
            h2: "Planning and Execution Guides",
            paragraphs: [
              "These guides focus on the decisions teams make while planning and delivering work: what to do first, how to set goals, and how to handle uncertainty.",
            ],
            bullets: [
              "How to prioritize tasks when everything feels important.",
              "How to set project goals that can be tracked and reviewed.",
              "How to manage project risks before they become blockers.",
              "Task management best practices and productivity tools for teams.",
              "What a Gantt chart is and when a timeline view is useful.",
            ],
          },
          {
            h2: "Product Documentation",
            paragraphs: [
              "Guides explain methods; documentation explains the product. When you know the workflow you want, use the documentation and feature pages to see how to implement it in Theta PM with projects, tasks, views, and integrations.",
            ],
          },
        ]}
        faqs={[
          {
            q: "Are these resources free to read?",
            a: "Yes. The guides and documentation linked from this page are available to read on the Theta PM site.",
          },
          {
            q: "Which guide should I start with?",
            a: "If your team is new to visual workflow management, start with the Kanban guide. If you are choosing between methods, the comparison guides (such as Kanban vs Scrum) are a better first stop. For delivery decisions, try the prioritization, goals, or risk guides.",
          },
          {
            q: "Do the guides apply only to Theta PM?",
            a: "The guides explain general project management concepts and practices. They also point to relevant Theta PM features where a concept maps directly to how you can run the work in the product.",
          },
        ]}
        internalLinks={[
          { label: "Kanban Guide", href: "/guides/kanban" },
          { label: "Kanban vs Scrum", href: "/guides/kanban-vs-scrum" },
          { label: "How to Prioritize Tasks", href: "/guides/how-to-prioritize-tasks" },
          { label: "How to Manage Project Risks", href: "/guides/how-to-manage-project-risks" },
          { label: "Documentation", href: "/docs" },
          { label: "Features", href: "/features" },
        ]}
      />
    </SeoShell>
  );
}
