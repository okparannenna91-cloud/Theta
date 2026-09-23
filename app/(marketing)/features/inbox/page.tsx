import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Team Inbox | Theta PM",
  description: "Centralize your team communication in one place. Manage mentions, comments, and updates without switching apps.",
  path: "/features/inbox",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Features", "Inbox"]}
        title="Team Inbox & Notifications | Theta PM"
        intro={["Centralize your team communication in one place. Manage mentions, comments, and updates without switching apps."]}
        sections={[
          { h2: "Key Features", bullets: ["Unified notifications", "Smart filtering", "Mention tracking", "Comment threads", "Activity history"] },
        ]}
        faqs={[
          { q: "What is the team inbox?", a: "The team inbox centralizes all notifications, mentions, and updates in one place." },
        ]}
        internalLinks={[
          { label: "Pricing", href: "/pricing" },
          { label: "Get Started", href: "/sign-up" },
        ]}
      />
    </SeoShell>
  );
}
