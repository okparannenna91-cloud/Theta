import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "System Status | Theta PM",
  description: "Check the current status of Theta PM. Real-time uptime monitoring and incident reports.",
  path: "/status",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Status"]}
        title="System Status | Theta PM"
        intro={["Check the current status of Theta PM. Real-time uptime monitoring and incident reports."]}
        sections={[]}
        faqs={[]}
        internalLinks={[]}
      />
    </SeoShell>
  );
}
