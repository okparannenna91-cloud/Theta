import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Slack Integration | Theta PM",
  description: "Connect Theta PM with Slack. Get instant notifications and updates in your Slack workspace.",
  path: "/integrations/slack",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Integrations/Slack"]}
        title="Slack Integration | Theta PM"
        intro={["Connect Theta PM with Slack. Get instant notifications and updates in your Slack workspace."]}
        sections={[]}
        faqs={[]}
        internalLinks={[]}
      />
    </SeoShell>
  );
}
