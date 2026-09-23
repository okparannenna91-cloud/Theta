import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Careers | Theta PM",
  description: "Join the Theta PM team. Explore open positions and build the future of project management.",
  path: "/careers",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Careers"]}
        title="Careers | Theta PM"
        intro={["Join the Theta PM team. Explore open positions and build the future of project management."]}
        sections={[
          { h2: "Join Our Team", bullets: ["Open positions", "Engineering roles", "Product roles", "Design roles", "Culture and benefits"] },
        ]}
        faqs={[
          { q: "Is remote work available?", a: "Yes, Theta PM supports remote-first with offices in select locations." },
        ]}
        internalLinks={[
          { label: "About", href: "/about" },
          { label: "Pricing", href: "/pricing" },
          { label: "Team", href: "/features/collaboration" },
        ]}
      />
    </SeoShell>
  );
}
