import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Milestone Tracking | Theta PM",
  description: "Track key milestones and deadlines. Monitor progress toward critical project goals and deliverables.",
  path: "/features/milestones",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Features/Milestones"]}
        title="Milestone Tracking | Theta PM"
        intro={["Track key milestones and deadlines. Monitor progress toward critical project goals and deliverables."]}
        sections={[]}
        faqs={[]}
        internalLinks={[]}
      />
    </SeoShell>
  );
}
