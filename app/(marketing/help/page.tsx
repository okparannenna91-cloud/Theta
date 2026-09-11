import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Help Center | Theta PM",
  description: "Get help with Theta PM. FAQs, tutorials, and support for all your project management needs.",
  path: "/help",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Help"]}
        title="Help Center | Theta PM"
        intro={["Get help with Theta PM. FAQs, tutorials, and support for all your project management needs."]}
        sections={[]}
        faqs={[]}
        internalLinks={[]}
      />
    </SeoShell>
  );
}
