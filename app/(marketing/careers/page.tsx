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
        sections={[]}
        faqs={[]}
        internalLinks={[]}
      />
    </SeoShell>
  );
}
