import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

const BASE = "https://www.thetapm.site";

export const metadata: Metadata = buildMetadata({
  title: "Theta Plus: Theta PM for Larger Organizations",
  description:
    "Theta Plus removes the user cap, adds role-based permissions and unlimited integrations, and costs $20 per month plus $4 per user. Here is what it covers and how to roll it out.",
  path: "/pricing/enterprise",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Pricing", "Enterprise"]}
        title="Theta Plus for Larger Organizations"
        intro={[
          "Theta PM's largest plan is called Theta Plus. It exists for one reason: past a certain size, per-seat planning stops working. Headcount becomes a mix of employees, contractors, and seasonal staff, and access has to be granted by role rather than person by person.",
          "Plus removes the user cap entirely and adds role-based permissions. It is $20 per month plus $4 per user, and annual billing takes 20% off. This page explains exactly what that covers, and what to verify before a wider rollout.",
        ]}
        sections={[
          {
            h2: "What Theta Plus Includes",
            paragraphs: [
              "Plus is Pro with the ceilings removed. Everything in the Pro column carries over, and the two constraints that matter at scale — a user cap and flat permissions — come off.",
            ],
            bullets: [
              "Unlimited users, so a contractor or a new department does not trigger a plan review.",
              "Role-based permissions, so access is granted by function rather than individually.",
              "Unlimited integrations, including multiple repositories and Slack workspaces.",
              "Unlimited automations and unlimited custom fields.",
              "Advanced analytics, time tracking with reports, and API access.",
              "Priority support.",
            ],
          },
          {
            h2: "How Plus Compares to Pro",
            table: {
              headers: ["", "Pro", "Theta Plus"],
              rows: [
                ["Price", "$10/mo + $3 per user", "$20/mo + $4 per user"],
                ["Users", "Up to 50", "Unlimited"],
                ["Permissions", "Workspace membership", "Role-based permissions"],
                ["Integrations", "Unlimited", "Unlimited"],
                ["Automations", "Unlimited", "Unlimited"],
                ["Analytics & time tracking", "Included", "Included"],
                ["API access", "Included", "Included"],
                ["Support", "Priority", "Priority"],
              ],
            },
          },
          {
            h2: "When Plus Is the Right Answer",
            paragraphs: [
              "The threshold is not a headcount number, it is whether you can predict your seat count. If you can, Pro is cheaper at every size up to fifty. If you cannot, Plus removes the constraint that keeps forcing the question.",
            ],
            bullets: [
              "You regularly invite contractors, freelancers, or seasonal staff.",
              "Several departments share one workspace and need different levels of access.",
              "You are already over fifty users and were weighing multiple Pro workspaces.",
              "You need permissions to be auditable by role rather than reconstructed from memory.",
              "You want a single workspace rather than parallel ones split by team.",
            ],
          },
          {
            h2: "What Plus Costs",
            paragraphs: [
              "Plus is $20 per month plus $4 per user. Because the user count is uncapped, the total is simply the number of members you actually have.",
            ],
            table: {
              headers: ["Members", "Monthly", "Annual (20% off)"],
              rows: [
                ["25", "$20 + $100 = $120", "≈ $1,152/yr"],
                ["50", "$20 + $200 = $220", "≈ $2,112/yr"],
                ["100", "$20 + $400 = $420", "≈ $4,032/yr"],
                ["200", "$20 + $800 = $820", "≈ $7,872/yr"],
              ],
            },
          },
          {
            h2: "Security and Data Isolation",
            paragraphs: [
              "Every Theta PM workspace is isolated with strict tenant separation — a workspace only ever reads its own projects, tasks, and integrations. Data is encrypted in transit and at rest.",
              "Integration credentials are a separate concern and are treated as such: tokens for GitHub, Slack, and storefront connections are encrypted on the server, never returned to the browser, and revoked when the integration is disconnected. The API exposes only the provider, basic configuration, and last sync time.",
            ],
            bullets: [
              "Workspace isolation with no cross-tenant data access.",
              "Encryption in transit and at rest.",
              "Server-side encryption of third-party integration tokens.",
              "Role-based permissions to separate access by function.",
              "Integrations can be disconnected at any time, which revokes the stored credentials.",
            ],
          },
          {
            h2: "Before a Wider Rollout: What to Verify",
            paragraphs: [
              "We would rather you check than assume. These are the questions large organizations ask first, and the honest answers.",
            ],
            h3s: [
              {
                heading: "Pilot with one team",
                body: "Run a single department for four weeks before inviting the rest of the organization. Confirm the board and timeline fit how that team already works, and that the integrations they depend on are connected.",
              },
              {
                heading: "Confirm your access model maps to roles",
                body: "Role-based permissions cover functional separation — who can administer, who can edit, who can read. If your access model depends on attribute-level rules from another system, ask before you commit.",
              },
              {
                heading: "Check the specific controls your review requires",
                body: "Workspace isolation, encryption in transit and at rest, and server-side token handling are in place. If your security review needs something beyond that — a specific certification, contract term, or data-residency arrangement — ask us directly rather than inferring it from this page.",
              },
              {
                heading: "Plan the migration, not just the purchase",
                body: "Existing work comes in through CSV export from your current tool, or through the Asana and Trello integrations. Map statuses and owners before importing, then run both tools in parallel for a sprint.",
              },
            ],
          },
          {
            h2: "Getting Started",
            paragraphs: [
              "You can create a workspace and evaluate the product on the free plan without talking to anyone. When you are ready to move to Plus, the upgrade is a billing change — projects, tasks, comments, files, and integrations stay exactly where they are.",
            ],
          },
        ]}
        faqs={[
          {
            q: "Is there a separate enterprise plan beyond Theta Plus?",
            a: "No. Theta Plus is the top plan: unlimited users, role-based permissions, unlimited integrations and automations, advanced analytics, time tracking, API access, and priority support. Organizations with requirements beyond that should contact us before purchasing.",
          },
          {
            q: "How much does Theta Plus cost?",
            a: "Twenty dollars per month plus four dollars per user, with a 20% discount on annual billing. Because there is no user cap, the total is just the base fee plus your actual member count.",
          },
          {
            q: "Does Plus include single sign-on?",
            a: "We do not advertise SSO on this page, and we would rather say that plainly than imply it. If single sign-on or a specific compliance control is a hard requirement for your organization, ask before you buy so you get an accurate answer for your environment.",
          },
          {
            q: "Can we keep separate workspaces per department?",
            a: "Yes. Workspaces are fully isolated, so a department can have its own with no cross-tenant access. Plus is usually chosen when an organization would rather run one workspace with role-based permissions than maintain several.",
          },
          {
            q: "What happens to our data if we move off Plus?",
            a: "Nothing is deleted. You keep every project, task, comment, and file. If you move to a plan with a user cap while above it, you cannot add members until you are back under the limit, but existing work continues to function.",
          },
        ]}
        internalLinks={[
          { label: "Full pricing", href: "/pricing" },
          { label: "Free vs Pro", href: "/pricing/free-vs-pro" },
          { label: "Theta PM for growing businesses", href: "/pricing/business" },
          { label: "Portfolio view", href: "/features/portfolio" },
          { label: "Reports", href: "/features/reports" },
          { label: "Help Center", href: "/help" },
        ]}
      />
    </SeoShell>
  );
}
