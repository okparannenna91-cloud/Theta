import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "How to Set Project Goals: Complete Guide",
  description: "Learn how to set effective project goals using OKRs and SMART criteria.",
  path: "/guides/how-to-set-project-goals",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Guides/How To Set Project Goals"]}
        title="How to Set Project Goals: Complete Guide"
        intro={["Learn how to set effective project goals using OKRs and SMART criteria."]}
        sections={[]}
        faqs={[]}
        internalLinks={[]}
      />
    </SeoShell>
  );
}
