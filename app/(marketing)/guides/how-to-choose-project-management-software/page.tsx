import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "How to Choose Project Management Software",
  description: "Learn how to choose the right project management software for your team.",
  path: "/guides/how-to-choose-project-management-software",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Guides", "How to Choose"]}
        title="How to Choose Project Management Software"
        intro={["Learn how to choose the right project management software for your team."]}
        sections={[
          { h2: "Key Criteria", bullets: ["Key criteria", "Feature comparison", "Pricing models", "Scalability", "Team needs"] },
        ]}
        faqs={[
          { q: "What should I look for?", a: "Look for features that match your team's workflow, scalability, and budget." },
        ]}
        internalLinks={[
          { label: "Project Management Software", href: "/project-management-software" },
          { label: "Features", href: "/features/tasks" },
        ]}
      />
    </SeoShell>
  );
}
