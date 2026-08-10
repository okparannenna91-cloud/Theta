import Link from "next/link";
import { Logo } from "@/components/ui/logo";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
      {children}
    </Link>
  );
}

export function SeoShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <nav className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <Logo size={16} href="/" showWordmark={false} container priority />
          <div className="hidden md:flex items-center gap-6 text-sm">
            <NavLink href="/project-management-software">Comparisons</NavLink>
            <NavLink href="/alternatives/jira-alternative">Alternatives</NavLink>
            <NavLink href="/guides/kanban">Guides</NavLink>
            <NavLink href="/features/tasks">Features</NavLink>
            <NavLink href="/pricing">Pricing</NavLink>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/sign-in" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="text-sm font-medium px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      <main className="flex-1">{children}</main>

      <footer className="border-t py-14 bg-card">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-8">
            <div>
              <Logo size={16} href="/" showWordmark={false} container />
              <p className="text-sm text-muted-foreground mt-3 max-w-xs">
                Theta PM is a PM-native project management platform for modern teams.
              </p>
              <div className="flex items-center gap-3 mt-4">
                <a
                  href="https://x.com/Theta_PM"
                  target="_blank"
                  rel="noopener noreferrer"
                  aria-label="Theta PM on X"
                  className="flex items-center justify-center w-8 h-8 rounded-md border border-border/60 bg-background text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z" />
                  </svg>
                </a>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-x-16 gap-y-2">
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Product</h4>
                <NavLink href="/features/tasks">Task Management</NavLink>
                <NavLink href="/features/kanban-board">Kanban</NavLink>
                <NavLink href="/features/gantt">Gantt</NavLink>
                <NavLink href="/features/collaboration">Collaboration</NavLink>
              </div>
              <div className="space-y-2.5">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Resources</h4>
                <NavLink href="/guides/kanban">Kanban Guide</NavLink>
                <NavLink href="/guides/kanban-vs-scrum-vs-agile">Kanban vs Scrum vs Agile</NavLink>
                <NavLink href="/project-management-software">Comparisons</NavLink>
                <NavLink href="/alternatives/jira-alternative">Alternatives</NavLink>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-8 mt-10 border-t text-xs text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Theta PM Systems.</p>
            <div className="flex gap-6">
              <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy Policy</Link>
              <Link href="/terms" className="hover:text-foreground transition-colors">Terms of Service</Link>
              <Link href="/docs" className="hover:text-foreground transition-colors">Documentation</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
