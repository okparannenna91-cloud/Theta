import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Project Management Frameworks: A Complete Guide",
  description: "Compare the top project management frameworks including Waterfall, Agile, Scrum, Kanban, and Hybrid.",
  path: "/guides/project-management-framework",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Guides/Project Management Framework"]}
        title="Project Management Frameworks: A Complete Guide"
        intro={["Compare the top project management frameworks including Waterfall, Agile, Scrum, Kanban, and Hybrid."]}
        sections={[]}
        faqs={[]}
        internalLinks={[]}
      />
    </SeoShell>
  );
}
