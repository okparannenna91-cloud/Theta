import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "How to Use Kanban: A Step-by-Step Guide",
  description: "Learn how to use the kanban method to visualize workflows, manage tasks, and boost team productivity.",
  path: "/guides/how-to-use-kanban",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Guides/How To Use Kanban"]}
        title="How to Use Kanban: A Step-by-Step Guide"
        intro={["Learn how to use the kanban method to visualize workflows, manage tasks, and boost team productivity."]}
        sections={[]}
        faqs={[]}
        internalLinks={[]}
      />
    </SeoShell>
  );
}
