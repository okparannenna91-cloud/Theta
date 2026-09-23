import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "About | Theta PM",
  description: "Learn about Theta PM. Our mission, team, and the technology behind the project management platform.",
  path: "/about",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "About"]}
        title="About | Theta PM"
        intro={["Learn about Theta PM. Our mission, team, and the technology behind the project management platform."]}
        sections={[
          { h2: "Our Mission", bullets: ["To build the most intuitive project management platform", "Empowering high-velocity teams to ship faster", "Real-time collaboration without the complexity"] },
        ]}
        faqs={[
          { q: "Who is Theta PM for?", a: "Theta PM is designed for high-velocity teams that need project management without the bloat." },
          { q: "Is there a free plan?", a: "Yes, Theta PM's free tier covers a small team of up to five members." },
        ]}
        internalLinks={[
          { label: "Careers", href: "/careers" },
          { label: "Pricing", href: "/pricing" },
          { label: "Documentation", href: "/docs" },
        ]}
      />
    </SeoShell>
  );
}
