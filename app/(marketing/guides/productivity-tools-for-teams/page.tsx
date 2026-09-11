import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Best Productivity Tools for Teams in 2026",
  description: "Discover the best productivity tools for teams. Compare project management and collaboration tools.",
  path: "/guides/productivity-tools-for-teams",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Guides/Productivity Tools For Teams"]}
        title="Best Productivity Tools for Teams in 2026"
        intro={["Discover the best productivity tools for teams. Compare project management and collaboration tools."]}
        sections={[]}
        faqs={[]}
        internalLinks={[]}
      />
    </SeoShell>
  );
}
