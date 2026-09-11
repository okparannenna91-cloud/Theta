import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Free vs Pro: Choose the Right Plan | Theta PM",
  description: "Compare Theta PM free tier vs Pro plan. See what features you get and which plan is right for your team.",
  path: "/pricing/free-vs-pro",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Pricing/Free Vs Pro"]}
        title="Free vs Pro: Choose the Right Plan | Theta PM"
        intro={["Compare Theta PM free tier vs Pro plan. See what features you get and which plan is right for your team."]}
        sections={[]}
        faqs={[]}
        internalLinks={[]}
      />
    </SeoShell>
  );
}
