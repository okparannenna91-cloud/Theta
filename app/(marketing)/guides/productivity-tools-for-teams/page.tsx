import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Productivity Tools for Teams",
  description: "Discover the best productivity tools and techniques to boost your team's efficiency.",
  path: "/guides/productivity-tools-for-teams",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Guides", "Productivity"]}
        title="Productivity Tools for Teams"
        intro={["Discover the best productivity tools and techniques to boost your team's efficiency."]}
        sections={[
          { h2: "Productivity Tools", bullets: ["Time management", "Task management", "Communication tools", "Automation", "Focus techniques"] },
        ]}
        faqs={[
          { q: "What are the best productivity tools?", a: "The best tools depend on your team's needs, but Theta PM offers a comprehensive suite." },
        ]}
        internalLinks={[
          { label: "Features", href: "/features/tasks" },
          { label: "Integrations", href: "/features/integrations" },
        ]}
      />
    </SeoShell>
  );
}
