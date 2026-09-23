import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "How to Manage Project Risks",
  description: "Learn how to identify, assess, and mitigate risks in your projects.",
  path: "/guides/how-to-manage-project-risks",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Guides", "How to Manage Risks"]}
        title="How to Manage Project Risks"
        intro={["Learn how to identify, assess, and mitigate risks in your projects."]}
        sections={[
          { h2: "Risk Management", bullets: ["Risk identification", "Risk assessment", "Mitigation strategies", "Risk registers", "Continuous monitoring"] },
        ]}
        faqs={[
          { q: "What is project risk management?", a: "Project risk management is the process of identifying, analyzing, and responding to risks." },
        ]}
        internalLinks={[
          { label: "Project Management Framework", href: "/guides/project-management-framework" },
          { label: "Guides", href: "/guides/kanban" },
        ]}
      />
    </SeoShell>
  );
}
