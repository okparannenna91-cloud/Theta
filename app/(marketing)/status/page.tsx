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
        sections={[
          { h2: "System Status", bullets: ["Real-time monitoring", "Incident history", "Uptime reports", "Maintenance schedules"] },
        ]}
        faqs={[
          { q: "What is the uptime guarantee?", a: "Theta PM guarantees 99.9% uptime with redundant infrastructure across multiple regions." },
        ]}
        internalLinks={[
          { label: "Documentation", href: "/docs" },
          { label: "API", href: "/integrations/github" },
        ]}
      />
    </SeoShell>
  );
}
