import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Team Inbox & Notifications | Theta PM",
  description: "Centralized team communication. Manage mentions, comments, and updates in one inbox.",
  path: "/features/inbox",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Features/Inbox"]}
        title="Team Inbox & Notifications | Theta PM"
        intro={["Centralized team communication. Manage mentions, comments, and updates in one inbox."]}
        sections={[]}
        faqs={[]}
        internalLinks={[]}
      />
    </SeoShell>
  );
}
