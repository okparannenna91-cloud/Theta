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
      <div className="flex items-center gap-2 px-8 py-3 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800 overflow-x-auto shrink-0">
        <Link
          href="/nova"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-slate-400 hover:text-indigo-500 hover:bg-indigo-50 dark:hover:bg-indigo-500/10 transition-all shrink-0"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <Sparkles className="w-3.5 h-3.5" />
          Nova
        </Link>
        <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 shrink-0" />
        <div className="flex items-center gap-1">
          {constitutionLinks.map((link) => {
            const isActive = pathname === link.href;
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "flex items-center gap-2 px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all shrink-0",
                  isActive
                    ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 shadow-sm"
                    : "text-slate-400 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                )}
              >
                <link.icon className="w-3 h-3" />
                {link.label}
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-indigo-500 ml-1" />
                )}
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
