import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Page Not Found | Theta PM",
  description: "The page you're looking for doesn't exist. Go back to the homepage and explore Theta PM.",
  path: "/404",
  noIndex: true,
});

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background gap-6">
      <div className="flex flex-col items-center gap-8 text-center max-w-md px-4">
        <Logo size="xl" />
        <div>
          <h1 className="text-6xl font-bold text-foreground mb-2">404</h1>
          <p className="text-sm text-muted-foreground">Page not found</p>
        </div>
        <p className="text-base text-muted-foreground max-w-sm">
          The page you&apos;re looking for doesn&apos;t exist or has been moved. Try searching below or go back to the homepage.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <Link href="/">
            <Button>Go Home</Button>
          </Link>
          <Link href="/project-management-software">
            <Button variant="outline">Browse Guides</Button>
          </Link>
        </div>
      </div>
      <section className="max-w-3xl mx-auto px-6 py-12">
        <h2 className="text-2xl font-bold text-foreground mb-4">Popular Pages</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Link href="/project-management-software" className="px-4 py-3 rounded-lg border border-border/40 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
            Best Project Management Software
          </Link>
          <Link href="/features/kanban-board" className="px-4 py-3 rounded-lg border border-border/40 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
            Kanban Board Features
          </Link>
          <Link href="/guides/kanban" className="px-4 py-3 rounded-lg border border-border/40 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
            Kanban Guide
          </Link>
          <Link href="/pricing" className="px-4 py-3 rounded-lg border border-border/40 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
            Pricing
          </Link>
          <Link href="/integrations/github" className="px-4 py-3 rounded-lg border border-border/40 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
            GitHub Integration
          </Link>
          <Link href="/features/tasks" className="px-4 py-3 rounded-lg border border-border/40 text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
            Task Management
          </Link>
        </div>
      </section>
    </div>
  );
}
