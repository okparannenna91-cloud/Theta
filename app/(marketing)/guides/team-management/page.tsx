import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Team Management Guide",
  description: "Learn how to manage teams effectively with the right tools and processes.",
  path: "/guides/team-management",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Guides", "Team Management"]}
        title="Team Management Guide"
        intro={["Learn how to manage teams effectively with the right tools and processes."]}
        sections={[
          { h2: "Team Management", bullets: ["Team structure", "Role assignment", "Communication", "Performance tracking", "Collaboration"] },
        ]}
        faqs={[
          { q: "How do I manage a remote team?", a: "Use collaboration tools, set clear expectations, and track progress transparently." },
        ]}
        internalLinks={[
          { label: "Features", href: "/features/collaboration" },
          { label: "Pricing", href: "/pricing" },
        ]}
      />
    </SeoShell>
  );
}
