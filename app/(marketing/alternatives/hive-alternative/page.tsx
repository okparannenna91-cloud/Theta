import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Best Hive Alternatives in 2026",
  description: "Looking for a Hive alternative? Compare the best Hive alternatives for project management.",
  path: "/alternatives/hive-alternative",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Alternatives/Hive Alternative"]}
        title="Best Hive Alternatives in 2026"
        intro={["Looking for a Hive alternative? Compare the best Hive alternatives for project management."]}
        sections={[]}
        faqs={[]}
        internalLinks={[]}
      />
    </SeoShell>
  );
}
