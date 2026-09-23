import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "How to Set Project Goals",
  description: "Learn how to set effective project goals that drive results and align your team.",
  path: "/guides/how-to-set-project-goals",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Guides", "How to Set Goals"]}
        title="How to Set Project Goals"
        intro={["Learn how to set effective project goals that drive results and align your team."]}
        sections={[
          { h2: "Goal Setting", bullets: ["SMART goals", "OKRs", "Goal alignment", "Tracking progress", "Review cycles"] },
        ]}
        faqs={[
          { q: "What are SMART goals?", a: "SMART stands for Specific, Measurable, Achievable, Relevant, and Time-bound." },
        ]}
        internalLinks={[
          { label: "Project Management Framework", href: "/guides/project-management-framework" },
          { label: "Guides", href: "/guides/kanban" },
        ]}
      />
    </SeoShell>
  );
}
