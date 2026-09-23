import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Agile Methodology: Complete Guide for Teams",
  description: "Learn what Agile methodology is, the principles behind Agile, and how to implement Agile.",
  path: "/guides/agile-methodology-guide",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Guides", "Agile Methodology Guide"]}
        title="Agile Methodology: Complete Guide for Teams"
        intro={["Learn what Agile methodology is, the principles behind Agile, and how to implement Agile."]}
        sections={[
          { h2: "Agile Principles", bullets: ["Agile principles", "Scrum and Kanban", "Sprint planning", "Retrospectives", "Continuous improvement"] },
        ]}
        faqs={[
          { q: "What is Agile?", a: "Agile is an iterative approach to project management and software development." },
        ]}
        internalLinks={[
          { label: "Kanban vs Scrum", href: "/guides/kanban-vs-scrum" },
          { label: "Guides", href: "/guides/kanban" },
        ]}
      />
    </SeoShell>
  );
}
