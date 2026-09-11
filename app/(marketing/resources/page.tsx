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
        sections={[]}
        faqs={[]}
        internalLinks={[]}
      />
    </SeoShell>
  );
}
