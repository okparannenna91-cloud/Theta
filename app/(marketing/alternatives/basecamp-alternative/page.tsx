import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Best Basecamp Alternatives in 2026",
  description: "Looking for a Basecamp alternative? Compare the best alternatives for modern team collaboration.",
  path: "/alternatives/basecamp-alternative",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Alternatives/Basecamp Alternative"]}
        title="Best Basecamp Alternatives in 2026"
        intro={["Looking for a Basecamp alternative? Compare the best alternatives for modern team collaboration."]}
        sections={[]}
        faqs={[]}
        internalLinks={[]}
      />
    </SeoShell>
  );
}
