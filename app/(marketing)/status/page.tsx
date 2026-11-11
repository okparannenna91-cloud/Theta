import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Theta PM System Status",
  description:
    "View Theta PM service status information, learn what to check if something is not working, and how to report an availability issue.",
  path: "/status",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Status"]}
        title="System Status"
        intro={[
          "This page provides service status information for Theta PM. If you are having trouble accessing your workspace or a feature is not behaving as expected, use the checks below to determine whether the issue is local to your setup or something you should report.",
          "For account-specific problems or to report an outage you believe is on our side, contact support with the time, affected area, and any error message you saw so we can investigate.",
        ]}
        sections={[
          {
            h2: "If Something Is Not Working",
            paragraphs: [
              "Many access issues are caused by local network, browser, or account conditions. A few quick checks can clarify the situation before you escalate it.",
            ],
            bullets: [
              "Confirm you can reach other websites and that your network or VPN is not blocking access.",
              "Refresh the page, try a private browser window, or sign in again if your session may have expired.",
              "Check whether the issue affects a single page or action (for example, one project view) or the entire app.",
              "If an integration is involved, verify the connection status in your workspace settings and whether the third-party service is available.",
            ],
          },
          {
            h2: "What to Include in a Report",
            paragraphs: [
              "Clear reports help us understand impact and reproduce the problem. When you contact support, include the details that distinguish a widespread service issue from a configuration or permission issue.",
            ],
            bullets: [
              "The approximate time the problem started and your timezone.",
              "The workspace, project, or feature affected (for example, boards, tasks, integrations, or sign-in).",
              "What you expected to happen and what happened instead, including any error text shown in the app.",
              "Whether the issue is consistent or intermittent, and whether other members of your workspace see it.",
            ],
          },
          {
            h2: "Planned Changes and Maintenance",
            paragraphs: [
              "From time to time, product updates or maintenance may affect availability or behavior. When we need to communicate service-impacting information broadly, this page is one of the places we will reference alongside direct support communication.",
              "For the latest help with using the product during or after a change, see the Help Center and Documentation.",
            ],
          },
        ]}
        faqs={[
          {
            q: "How do I report a possible outage?",
            a: "Email support@thetapm.site with the time the issue began, what part of Theta PM is affected, and any error messages you saw. If multiple workspace members are impacted, mention that as well.",
          },
          {
            q: "Does this page show a live uptime feed?",
            a: "This page provides status guidance and reporting information. If you need confirmation about a specific incident affecting your workspace, contact support for the most current details.",
          },
          {
            q: "Where can I get help using Theta PM?",
            a: "Visit the Help Center for support contact details and links to documentation and guides. The Documentation and Guides sections cover how to use features and common project management workflows.",
          },
        ]}
        internalLinks={[
          { label: "Help Center", href: "/help" },
          { label: "Documentation", href: "/docs" },
          { label: "Resources", href: "/resources" },
          { label: "Pricing", href: "/pricing" },
        ]}
      />
    </SeoShell>
  );
}
