import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Portfolio Management | Theta PM",
  description: "Strategic portfolio management. View all projects, resources, and performance at a glance across your organization.",
  path: "/features/portfolio",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Features", "Portfolio"]}
        title="Portfolio Management | Theta PM"
        intro={["Strategic portfolio management. View all projects, resources, and performance at a glance across your organization."]}
        sections={[
          { h2: "Key Features", bullets: ["Portfolio overview", "Resource allocation", "Performance tracking", "Cross-project insights", "Executive dashboards"] },
        ]}
        faqs={[
          { q: "What is portfolio management?", a: "Portfolio management gives you a high-level view of all projects and their resource allocation." },
        ]}
        internalLinks={[
          { label: "Pricing", href: "/pricing" },
          { label: "Get Started", href: "/sign-up" },
        ]}
      />
    </SeoShell>
  );
}
