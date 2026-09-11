import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Project Calendar | Theta PM",
  description: "Visualize project tasks and deadlines on a calendar. Plan and schedule work across your team.",
  path: "/features/calendar",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Features/Calendar"]}
        title="Project Calendar | Theta PM"
        intro={["Visualize project tasks and deadlines on a calendar. Plan and schedule work across your team."]}
        sections={[]}
        faqs={[]}
        internalLinks={[]}
      />
    </SeoShell>
  );
}
