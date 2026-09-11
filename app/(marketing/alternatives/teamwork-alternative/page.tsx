import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Best Teamwork Alternatives in 2026",
  description: "Looking for a Teamwork alternative? Compare the best alternatives for client-facing project management.",
  path: "/alternatives/teamwork-alternative",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Alternatives/Teamwork Alternative"]}
        title="Best Teamwork Alternatives in 2026"
        intro={["Looking for a Teamwork alternative? Compare the best alternatives for client-facing project management."]}
        sections={[]}
        faqs={[]}
        internalLinks={[]}
      />
    </SeoShell>
  );
}
