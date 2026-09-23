import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Enterprise Plan | Theta PM",
  description: "The Theta PM Enterprise plan for organizations. Custom integrations, dedicated support, and advanced security.",
  path: "/pricing/enterprise",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Pricing/Enterprise"]}
        title="Enterprise Plan | Theta PM"
        intro={["The Theta PM Enterprise plan for organizations. Custom integrations, dedicated support, and advanced security."]}
        sections={[{ h2: "Key Features", bullets: ["Project management", "Real-time collaboration", "Automation", "Integrations"] }]}
        faqs={[{ q: "What is included?", a: "All features are included with your plan." }]}
        internalLinks={[{ label: "Pricing", href: "/pricing" }, { label: "Get Started", href: "/sign-up" }]}
      />
    </SeoShell>
  );
}
