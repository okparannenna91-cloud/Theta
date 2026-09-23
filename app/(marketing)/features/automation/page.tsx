import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Project Automation | Theta PM",
  description: "Automate repetitive tasks and workflows. Save hours with powerful project automation built into your project management tool.",
  path: "/features/automation",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Features", "Automation"]}
        title="Project Automation Software | Theta PM"
        intro={["Automate repetitive tasks and workflows. Save hours with powerful project automation built into your project management tool."]}
        sections={[
          { h2: "Key Features", bullets: ["Rule-based automation", "Workflow triggers", "Auto-assignments", "Status change automation", "Third-party integrations"] },
        ]}
        faqs={[
          { q: "What can I automate?", a: "You can automate task movement, assignments, notifications, and status changes." },
        ]}
        internalLinks={[
          { label: "Pricing", href: "/pricing" },
          { label: "Get Started", href: "/sign-up" },
        ]}
      />
    </SeoShell>
  );
}
