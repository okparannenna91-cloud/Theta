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
        sections={[]}
        faqs={[]}
        internalLinks={[]}
      />
    </SeoShell>
  );
}
