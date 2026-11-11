import type { Metadata } from "next";
import { SeoShell } from "@/components/seo/seo-shell";
import { SeoContent } from "@/components/seo/seo-content";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Careers at Theta PM",
  description:
    "Interested in working on Theta PM? Learn what we build, the kind of problems we care about, and how to get in touch about future opportunities.",
  path: "/careers",
});

export default function Page() {
  return (
    <SeoShell>
      <SeoContent
        breadcrumb={["Home", "Careers"]}
        title="Careers at Theta PM"
        intro={[
          "Theta PM is a PM-native workspace focused on helping teams plan and track work without a heavy setup tax. We build around projects and tasks as the core objects, with boards, timelines, collaboration, automation, and integrations that keep the same work in view.",
          "We do not maintain a public list of open roles on this page. If you are interested in future opportunities, the best starting point is to learn how the product works and reach out through our support channel with a short note about what you do and how you would like to contribute.",
        ]}
        sections={[
          {
            h2: "What We Work On",
            paragraphs: [
              "The problems we care about are practical: making it faster for a team to get from an idea to a working plan, keeping status trustworthy across views, and reducing the manual coordination that slows projects down.",
            ],
            bullets: [
              "Core project and task experiences across board, list, timeline, calendar, and reporting views.",
              "Collaboration features such as comments, mentions, and activity that keep work in one place.",
              "Automation and integrations that connect planning to the tools teams already use.",
              "Reliability, performance, and clear permission boundaries as workspaces grow.",
            ],
          },
          {
            h2: "How to Express Interest",
            paragraphs: [
              "When you reach out, include the role or area you are interested in, examples of relevant work, and what draws you to project management software. If a specific opportunity becomes available, that context helps us respond with the right information.",
            ],
            bullets: [
              "Email: support@thetapm.site with the subject “Careers at Theta PM”.",
              "Share a portfolio, GitHub profile, or a short summary of projects you have shipped.",
              "Tell us which part of the product or problem space you would most want to improve.",
            ],
          },
          {
            h2: "Learn the Product First",
            paragraphs: [
              "If you want a sense of what building at Theta PM involves, explore the product pages and guides. They reflect the workflows and trade-offs we optimize for: clear task ownership, plans that stay current, and features that are useful without lengthy onboarding.",
            ],
          },
        ]}
        faqs={[
          {
            q: "Are there open positions right now?",
            a: "We do not list open positions on this page. If you would like to be considered for a future role, email support@thetapm.site with your background and the kind of work you are interested in.",
          },
          {
            q: "What roles does Theta PM typically need?",
            a: "As a product company, our work generally spans engineering, product, and design. The specific needs depend on what we are building at the time, so sharing your area of focus is more useful than targeting a fixed list of titles.",
          },
          {
            q: "Where can I learn more about Theta PM?",
            a: "Start with the About page for our principles and the Features and Guides sections for how the product approaches planning, collaboration, and delivery.",
          },
        ]}
        internalLinks={[
          { label: "About Theta PM", href: "/about" },
          { label: "Features", href: "/features" },
          { label: "Guides", href: "/guides/kanban" },
          { label: "Help Center", href: "/help" },
        ]}
      />
    </SeoShell>
  );
}
