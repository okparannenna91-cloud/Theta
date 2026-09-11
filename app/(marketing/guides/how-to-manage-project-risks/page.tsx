import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "How to Manage Project Risks: Complete Guide",
  description: "Learn how to identify, assess, and mitigate project risks.",
  path: "/guides/how-to-manage-project-risks",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Guides/How To Manage Project Risks"]}
        title="How to Manage Project Risks: Complete Guide"
        intro={["Learn how to identify, assess, and mitigate project risks."]}
        sections={[]}
        faqs={[]}
        internalLinks={[]}
      />
    </SeoShell>
  );
}
