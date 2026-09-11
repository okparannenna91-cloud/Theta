import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Best Airtable Alternatives in 2026",
  description: "Looking for an Airtable alternative? Compare the best project management tools with spreadsheet-style interfaces.",
  path: "/alternatives/airtable-alternative",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Alternatives/Airtable Alternative"]}
        title="Best Airtable Alternatives in 2026"
        intro={["Looking for an Airtable alternative? Compare the best project management tools with spreadsheet-style interfaces."]}
        sections={[]}
        faqs={[]}
        internalLinks={[]}
      />
    </SeoShell>
  );
}
