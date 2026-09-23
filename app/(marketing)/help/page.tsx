import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Help Center | Theta PM",
  description: "Get help with Theta PM. FAQs, tutorials, and support for all your project management needs.",
  path: "/help",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Help"]}
        title="Help Center | Theta PM"
        intro={["Get help with Theta PM. FAQs, tutorials, and support for all your project management needs."]}
        sections={[
          { h2: "Help Center", bullets: ["Search our knowledge base", "Submit a support ticket", "Browse tutorials and guides"] },
        ]}
        faqs={[
          { q: "How do I contact support?", a: "You can reach our support team via the in-app help widget or by email." },
          { q: "Is there a knowledge base?", a: "Yes, our documentation and help center have everything you need." },
        ]}
        internalLinks={[
          { label: "Documentation", href: "/docs" },
          { label: "Status", href: "/status" },
          { label: "Contact", href: "/integrations/slack" },
        ]}
      />
    </SeoShell>
  );
}
