import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Best Smartsheet Alternatives in 2026",
  description: "Looking for a Smartsheet alternative? Compare the best alternatives with real-time collaboration. Find the right tool for your team's needs.",
  path: "/alternatives/smartsheet-alternative",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Alternatives/Smartsheet Alternative"]}
        title="Best Smartsheet Alternatives in 2026"
        intro={["Looking for a Smartsheet alternative? Compare the best alternatives with real-time collaboration."]}
        sections={[{ h2: "Key Features", bullets: ["Project management", "Real-time collaboration", "Automation", "Integrations"] }]}
        faqs={[{ q: "What is included?", a: "All features are included with your plan." }]}
        internalLinks={[{ label: "Pricing", href: "/pricing" }, { label: "Get Started", href: "/sign-up" }]}
      />
    </SeoShell>
  );
}
