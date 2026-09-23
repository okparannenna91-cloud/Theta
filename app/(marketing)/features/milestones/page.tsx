import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Milestones | Theta PM",
  description: "Track key project milestones and mark important achievements. Keep your team focused on what matters most.",
  path: "/features/milestones",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Features", "Milestones"]}
        title="Milestones | Theta PM"
        intro={["Track key project milestones and mark important achievements. Keep your team focused on what matters most."]}
        sections={[
          { h2: "Key Features", bullets: ["Milestone tracking", "Progress indicators", "Team notifications", "Custom milestones", "Timeline integration"] },
        ]}
        faqs={[
          { q: "What is a milestone?", a: "A milestone marks a significant point in your project timeline, like a completion or deadline." },
        ]}
        internalLinks={[
          { label: "Pricing", href: "/pricing" },
          { label: "Get Started", href: "/sign-up" },
        ]}
      />
    </SeoShell>
  );
}
