import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Project Calendar | Theta PM",
  description: "Visualize your project tasks and deadlines on a calendar. Plan and schedule work across your team.",
  path: "/features/calendar",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Features", "Calendar"]}
        title="Project Calendar | Theta PM"
        intro={["Visualize your project tasks and deadlines on a calendar. Plan and schedule work across your team."]}
        sections={[
          { h2: "Key Features", bullets: ["Calendar views", "Deadline tracking", "Event scheduling", "Team availability", "External calendar sync"] },
        ]}
        faqs={[
          { q: "Can I sync with Google Calendar?", a: "Yes, Theta PM integrates with Google Calendar, Outlook, and other calendar apps." },
        ]}
        internalLinks={[
          { label: "Pricing", href: "/pricing" },
          { label: "Get Started", href: "/sign-up" },
        ]}
      />
    </SeoShell>
  );
}
