import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Resources | Theta PM",
  description: "Browse Theta PM resources. Blog posts, guides, templates, and tools for project management.",
  path: "/resources",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Resources"]}
        title="Resources | Theta PM"
        intro={["Browse Theta PM resources. Blog posts, guides, templates, and tools for project management."]}
        sections={[
          { h2: "Resources", bullets: ["Blog posts and case studies", "Guides and tutorials", "Templates and toolkits"] },
        ]}
        faqs={[
          { q: "Are resources free?", a: "Yes, all our resources are free to download and use." },
        ]}
        internalLinks={[
          { label: "Guides", href: "/guides/kanban" },
          { label: "Documentation", href: "/docs" },
          { label: "Blog", href: "/resources" },
        ]}
      />
    </SeoShell>
  );
}
