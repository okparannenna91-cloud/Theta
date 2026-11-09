import Link from "next/link";
import { Logo } from "@/components/ui/logo";
import { NavDropdown, type NavDropdownCategory } from "./nav-dropdown";

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link href={href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
      {children}
    </Link>
  );
}

function MobileNavSection({
  title,
  categories,
}: {
  title: string;
  categories: NavDropdownCategory[];
}) {
  const items = categories.flatMap((c) => c.items);
  return (
    <div className="border-b border-border/40 px-1 py-3 last:border-b-0">
      <p className="pb-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{title}</p>
      <ul className="space-y-0.5">
        {items.map((item) => (
          <li key={`${title}-${item.href}`}>
            <Link href={item.href} className="block rounded-md px-2 py-2 text-sm text-foreground hover:bg-muted/50">
              {item.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

const featureColumns: NavDropdownCategory[] = [
  {
    title: "Plan",
    items: [
      { label: "Task Management", href: "/features/tasks" },
      { label: "Kanban Board", href: "/features/kanban-board" },
      { label: "Gantt Charts", href: "/features/gantt" },
      { label: "Timeline", href: "/features/timeline" },
      { label: "Calendar", href: "/features/calendar" },
      { label: "Milestones", href: "/features/milestones" },
      { label: "Project Planning", href: "/features/project-planning" },
    ],
  },
  {
    title: "Execute",
    items: [
      { label: "Collaboration", href: "/features/collaboration" },
      { label: "Inbox", href: "/features/inbox" },
      { label: "Automation", href: "/features/automation" },
      { label: "Portfolio", href: "/features/portfolio" },
      { label: "Reports", href: "/features/reports" },
      { label: "Integrations", href: "/features/integrations" },
    ],
  },
];

const guideColumns: NavDropdownCategory[] = [
  {
    title: "Methodologies",
    items: [
      { label: "What is Agile", href: "/guides/what-is-agile" },
      { label: "What is a Sprint", href: "/guides/what-is-a-sprint" },
      { label: "Agile Methodology Guide", href: "/guides/agile-methodology-guide" },
      { label: "Kanban Guide", href: "/guides/kanban" },
      { label: "How to Use Kanban", href: "/guides/how-to-use-kanban" },
      { label: "Kanban vs Scrum", href: "/guides/kanban-vs-scrum" },
      { label: "Kanban vs Scrum vs Agile", href: "/guides/kanban-vs-scrum-vs-agile" },
      { label: "Scrum vs Waterfall", href: "/guides/scrum-vs-waterfall" },
    ],
  },
  {
    title: "Planning & Delivery",
    items: [
      { label: "What is a Gantt Chart", href: "/guides/what-is-a-gantt-chart" },
      { label: "How to Set Project Goals", href: "/guides/how-to-set-project-goals" },
      { label: "How to Manage Project Risks", href: "/guides/how-to-manage-project-risks" },
      { label: "How to Prioritize Tasks", href: "/guides/how-to-prioritize-tasks" },
      { label: "PM Framework", href: "/guides/project-management-framework" },
      { label: "How to Choose PM Software", href: "/guides/how-to-choose-project-management-software" },
    ],
  },
  {
    title: "Teams",
    items: [
      { label: "Team Management", href: "/guides/team-management" },
      { label: "Task Management Best Practices", href: "/guides/task-management-best-practices" },
      { label: "Productivity Tools for Teams", href: "/guides/productivity-tools-for-teams" },
    ],
  },
];

const alternativeColumns: NavDropdownCategory[] = [
  {
    title: "Popular",
    items: [
      { label: "Jira Alternative", href: "/alternatives/jira-alternative" },
      { label: "Asana Alternative", href: "/alternatives/asana-alternative" },
      { label: "Monday Alternative", href: "/alternatives/monday-alternative" },
      { label: "ClickUp Alternative", href: "/alternatives/clickup-alternative" },
      { label: "Trello Alternative", href: "/alternatives/trello-alternative" },
      { label: "Notion Alternative", href: "/alternatives/notion-alternative" },
    ],
  },
  {
    title: "More",
    items: [
      { label: "MS Project Alternative", href: "/alternatives/microsoft-project-alternative" },
      { label: "Basecamp Alternative", href: "/alternatives/basecamp-alternative" },
      { label: "Hive Alternative", href: "/alternatives/hive-alternative" },
      { label: "Smartsheet Alternative", href: "/alternatives/smartsheet-alternative" },
      { label: "Airtable Alternative", href: "/alternatives/airtable-alternative" },
      { label: "Teamwork Alternative", href: "/alternatives/teamwork-alternative" },
    ],
  },
];

const comparisonColumns: NavDropdownCategory[] = [
  {
    title: "Comparisons",
    items: [
      { label: "All Comparisons", href: "/project-management-software" },
      { label: "Theta vs Asana", href: "/project-management-software/theta-vs-asana" },
      { label: "Theta vs ClickUp", href: "/project-management-software/theta-vs-clickup" },
      { label: "Theta vs Jira", href: "/project-management-software/theta-vs-jira" },
      { label: "Theta vs Monday", href: "/project-management-software/theta-vs-monday" },
      { label: "Theta vs Notion", href: "/project-management-software/theta-vs-notion" },
      { label: "Theta vs Trello", href: "/project-management-software/theta-vs-trello" },
      { label: "Theta vs Wrike", href: "/project-management-software/theta-vs-wrike" },
    ],
  },
];

const integrationColumns: NavDropdownCategory[] = [
  {
    items: [
      { label: "GitHub", href: "/integrations/github" },
      { label: "Slack", href: "/integrations/slack" },
    ],
  },
];

export function SeoShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <nav className="sticky top-0 z-50 w-full bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="max-w-5xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <Logo size={16} href="/" showWordmark={false} container priority />
          <div className="hidden md:flex items-center gap-6 text-sm">
            <NavDropdown label="Features" columns={featureColumns} />
            <NavDropdown label="Guides" columns={guideColumns} />
            <NavDropdown label="Alternatives" columns={alternativeColumns} />
            <NavDropdown label="Comparisons" columns={comparisonColumns} />
            <NavDropdown label="Integrations" columns={integrationColumns} />
            <NavLink href="/pricing">Pricing</NavLink>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href="/sign-in"
              className="hidden sm:inline-flex text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign In
            </Link>
            <Link
              href="/sign-up"
              className="text-sm font-medium px-3 sm:px-4 py-2 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Get Started
            </Link>
            <details className="relative md:hidden">
              <summary
                aria-label="Open navigation menu"
                className="flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-lg border border-border/60 bg-background text-foreground [&::-webkit-details-marker]:hidden"
              >
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  aria-hidden="true"
                >
                  <path d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </summary>
              <div className="absolute right-0 top-full z-50 mt-3 max-h-[70vh] w-[min(20rem,calc(100vw-3rem))] overflow-y-auto rounded-xl border border-border/60 bg-background p-2 shadow-xl">
                <MobileNavSection title="Features" categories={featureColumns} />
                <MobileNavSection title="Guides" categories={guideColumns} />
                <MobileNavSection title="Alternatives" categories={alternativeColumns} />
                <MobileNavSection title="Comparisons" categories={comparisonColumns} />
                <MobileNavSection title="Integrations" categories={integrationColumns} />
                <div className="flex flex-col gap-1 p-1 pt-3">
                  <Link href="/pricing" className="rounded-md px-2 py-2 text-sm font-medium text-foreground hover:bg-muted/50">
                    Pricing
                  </Link>
                  <Link href="/sign-in" className="rounded-md px-2 py-2 text-sm text-muted-foreground hover:bg-muted/50 sm:hidden">
                    Sign In
                  </Link>
                </div>
              </div>
            </details>
          </div>
        </div>
      </nav>

      <main className="flex-1">{children}</main>

      <footer className="border-t py-14 bg-card">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-x-8 gap-y-10">
            <div className="col-span-2 md:col-span-3 lg:col-span-1">
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

            <div className="flex flex-col gap-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Features</h4>
              <NavLink href="/features/tasks">Task Management</NavLink>
              <NavLink href="/features/kanban-board">Kanban</NavLink>
              <NavLink href="/features/gantt">Gantt</NavLink>
              <NavLink href="/features/timeline">Timeline</NavLink>
              <NavLink href="/features/collaboration">Collaboration</NavLink>
              <NavLink href="/features/automation">Automation</NavLink>
              <NavLink href="/features/reports">Reports</NavLink>
            </div>

            <div className="flex flex-col gap-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Guides</h4>
              <NavLink href="/guides/kanban">Kanban Guide</NavLink>
              <NavLink href="/guides/what-is-agile">What is Agile</NavLink>
              <NavLink href="/guides/kanban-vs-scrum">Kanban vs Scrum</NavLink>
              <NavLink href="/guides/what-is-a-gantt-chart">What is a Gantt Chart</NavLink>
              <NavLink href="/guides/how-to-prioritize-tasks">How to Prioritize</NavLink>
              <NavLink href="/guides/team-management">Team Management</NavLink>
            </div>

            <div className="flex flex-col gap-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Compare</h4>
              <NavLink href="/project-management-software">All Comparisons</NavLink>
              <NavLink href="/alternatives/jira-alternative">vs Jira</NavLink>
              <NavLink href="/alternatives/asana-alternative">vs Asana</NavLink>
              <NavLink href="/alternatives/clickup-alternative">vs ClickUp</NavLink>
              <NavLink href="/alternatives/monday-alternative">vs Monday</NavLink>
              <NavLink href="/alternatives/trello-alternative">vs Trello</NavLink>
            </div>

            <div className="flex flex-col gap-2.5">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-foreground">Company</h4>
              <NavLink href="/about">About</NavLink>
              <NavLink href="/careers">Careers</NavLink>
              <NavLink href="/pricing">Pricing</NavLink>
              <NavLink href="/integrations/github">GitHub</NavLink>
              <NavLink href="/integrations/slack">Slack</NavLink>
              <NavLink href="/docs">Documentation</NavLink>
              <NavLink href="/help">Help Center</NavLink>
              <NavLink href="/status">Status</NavLink>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-8 mt-10 border-t text-xs text-muted-foreground">
            <p>&copy; {new Date().getFullYear()} Theta PM Systems.</p>
            <div className="flex flex-wrap justify-center gap-x-6 gap-y-2">
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
