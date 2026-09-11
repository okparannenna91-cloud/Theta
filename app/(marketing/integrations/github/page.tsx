import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "GitHub Integration | Theta PM",
  description: "Connect Theta PM with GitHub. Sync repositories, issues, and pull requests to your tasks seamlessly.",
  path: "/integrations/github",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Integrations/Github"]}
        title="GitHub Integration | Theta PM"
        intro={["Connect Theta PM with GitHub. Sync repositories, issues, and pull requests to your tasks seamlessly."]}
        sections={[]}
        faqs={[]}
        internalLinks={[]}
      />
    </SeoShell>
  );
}
