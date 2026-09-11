import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Best Asana Alternatives in 2026",
  description: "Looking for an Asana alternative? Compare the best Asana alternatives with more flexibility and lower pricing.",
  path: "/alternatives/asana-alternative",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Alternatives/Asana Alternative"]}
        title="Best Asana Alternatives in 2026"
        intro={["Looking for an Asana alternative? Compare the best Asana alternatives with more flexibility and lower pricing."]}
        sections={[]}
        faqs={[]}
        internalLinks={[]}
      />
    </SeoShell>
  );
}
