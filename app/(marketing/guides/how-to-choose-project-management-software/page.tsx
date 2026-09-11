import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "How to Choose Project Management Software",
  description: "Learn how to choose the right project management software for your team.",
  path: "/guides/how-to-choose-project-management-software",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Guides/How To Choose Project Management Software"]}
        title="How to Choose Project Management Software"
        intro={["Learn how to choose the right project management software for your team."]}
        sections={[]}
        faqs={[]}
        internalLinks={[]}
      />
    </SeoShell>
  );
}
