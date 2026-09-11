import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Team Management: Best Practices and Tools",
  description: "Learn how to effectively manage teams, delegate tasks, and improve collaboration.",
  path: "/guides/team-management",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Guides/Team Management"]}
        title="Team Management: Best Practices and Tools"
        intro={["Learn how to effectively manage teams, delegate tasks, and improve collaboration."]}
        sections={[]}
        faqs={[]}
        internalLinks={[]}
      />
    </SeoShell>
  );
}
