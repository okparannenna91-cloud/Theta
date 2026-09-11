import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Project Reports & Dashboards | Theta PM",
  description: "Generate detailed project reports and analytics dashboards. Track KPIs and make data-driven decisions.",
  path: "/features/reports",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Features/Reports"]}
        title="Project Reports & Dashboards | Theta PM"
        intro={["Generate detailed project reports and analytics dashboards. Track KPIs and make data-driven decisions."]}
        sections={[]}
        faqs={[]}
        internalLinks={[]}
      />
    </SeoShell>
  );
}
