import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Best Smartsheet Alternatives in 2026",
  description: "Looking for a Smartsheet alternative? Compare the best alternatives with real-time collaboration.",
  path: "/alternatives/smartsheet-alternative",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Alternatives/Smartsheet Alternative"]}
        title="Best Smartsheet Alternatives in 2026"
        intro={["Looking for a Smartsheet alternative? Compare the best alternatives with real-time collaboration."]}
        sections={[]}
        faqs={[]}
        internalLinks={[]}
      />
    </SeoShell>
  );
}
