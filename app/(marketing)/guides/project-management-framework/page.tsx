import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Project Management Framework",
  description: "Learn about the different project management frameworks and how to choose the right one.",
  path: "/guides/project-management-framework",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Guides", "Framework"]}
        title="Project Management Framework"
        intro={["Learn about the different project management frameworks and how to choose the right one."]}
        sections={[
          { h2: "Frameworks", bullets: ["Frameworks overview", "Waterfall", "Agile", "Scrum", "Kanban"] },
        ]}
        faqs={[
          { q: "Which framework should I choose?", a: "Choose based on your team's size, project type, and delivery cadence." },
        ]}
        internalLinks={[
          { label: "Kanban vs Scrum", href: "/guides/kanban-vs-scrum" },
          { label: "Guides", href: "/guides/kanban" },
        ]}
      />
    </SeoShell>
  );
}
