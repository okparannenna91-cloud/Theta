"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { 
  Sparkles, Shield, Bot, Cpu, GitBranch, Workflow, 
  Layers, FileText, Activity, Puzzle, BookOpen, Users, 
  Brain, FolderKanban, BarChart3, Search, Lock, CheckSquare,
  ChevronLeft
} from "lucide-react";

const constitutionLinks = [
  { href: "/nova/constitution", label: "Constitution", icon: Shield },
  { href: "/nova/agents", label: "Agents", icon: Bot },
  { href: "/nova/ai-models", label: "AI Models", icon: Cpu },
  { href: "/nova/architecture", label: "Architecture", icon: GitBranch },
  { href: "/nova/automations", label: "Automations", icon: Workflow },
  { href: "/nova/context", label: "Context", icon: Layers },
  { href: "/nova/documents", label: "Documents", icon: FileText },
  { href: "/nova/evolution", label: "Evolution", icon: Activity },
  { href: "/nova/integrations", label: "Integrations", icon: Puzzle },
  { href: "/nova/knowledge", label: "Knowledge", icon: BookOpen },
  { href: "/nova/meetings", label: "Meetings", icon: Users },
  { href: "/nova/memory", label: "Memory", icon: Brain },
  { href: "/nova/projects", label: "Projects", icon: FolderKanban },
  { href: "/nova/reports", label: "Reports", icon: BarChart3 },
  { href: "/nova/search", label: "Search", icon: Search },
  { href: "/nova/security", label: "Security", icon: Lock },
  { href: "/nova/tasks", label: "Tasks", icon: CheckSquare },
];

export default function NovaLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isMainPage = pathname === "/nova";

  if (isMainPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-6 py-2 border-b bg-background/80 backdrop-blur-sm overflow-x-auto shrink-0">
        <Link
          href="/nova"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors shrink-0"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          Nova
        </Link>
        <div className="w-px h-5 bg-border shrink-0" />
        <div className="flex items-center gap-0.5">
          {constitutionLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors shrink-0 whitespace-nowrap",
                  isActive
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                <link.icon className="w-3.5 h-3.5" />
                {link.label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="flex-1 min-h-0">
        {children}
      </div>
    </div>
  );
}
