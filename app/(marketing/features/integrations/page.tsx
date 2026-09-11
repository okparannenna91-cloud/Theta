import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Project Management Integrations | Theta PM",
  description: "Connect Theta PM with your favorite tools. GitHub, Slack, Figma, Canva, and more.",
  path: "/features/integrations",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Features/Integrations"]}
        title="Project Management Integrations | Theta PM"
        intro={["Connect Theta PM with your favorite tools. GitHub, Slack, Figma, Canva, and more."]}
        sections={[]}
        faqs={[]}
        internalLinks={[]}
      />
    </SeoShell>
  );
}
