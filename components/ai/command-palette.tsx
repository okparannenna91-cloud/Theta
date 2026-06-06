"use client";

import * as React from "react";
import {
  Calendar,
  Settings,
  Plus,
  FileText,
  Zap,
  Sparkles,
  Command as CommandIcon,
  Search,
  Hash,
  Activity,
  Terminal,
  Cpu,
  Ghost
} from "lucide-react";
import { 
  Command, 
  CommandDialog, 
  CommandEmpty, 
  CommandGroup, 
  CommandInput, 
  CommandItem, 
  CommandList, 
  CommandSeparator, 
  CommandShortcut 
} from "@/components/ui/command";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

export function CommandPalette() {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  const runCommand = React.useCallback((command: () => void) => {
    setOpen(false);
    command();
  }, []);

  const handleAskNova = () => {
    runCommand(() => {
        router.push(`/nova?prompt=${encodeURIComponent(search)}`);
    });
  };

  const isSlashCommand = search.startsWith("/");

  const slashCommands = [
    {
      command: "/task",
      description: "Create a new task",
      icon: Plus,
      action: () => router.push("/tasks"),
    },
    {
      command: "/analyze",
      description: "Run workspace analysis",
      icon: Activity,
      action: () => router.push("/analytics"),
    },
    {
      command: "/chat",
      description: "Open team chat",
      icon: Cpu,
      action: () => router.push("/teams"),
    },
    {
      command: "/search",
      description: "Search workspace",
      icon: Search,
      action: () => {}, // Handled by search state
    },
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <div className="relative overflow-hidden bg-white/80 dark:bg-slate-950/80 backdrop-blur-3xl border-primary/20 rounded-lg shadow-sm">
        {/* Background Element */}
        <div className="absolute top-0 right-0 -z-10 w-64 h-64 bg-primary/10 blur-[80px] rounded-full pointer-events-none" />
        
        <div className="flex items-center border-b border-primary/10 px-6 py-4">
          <Terminal className="mr-4 h-5 w-5 text-primary" />
          <CommandInput 
            placeholder="Type a command or ask Nova..." 
            value={search}
            onValueChange={setSearch}
            className="h-12 border-none focus:ring-0 text-lg font-semibold placeholder:text-slate-400"
          />
          <div className="flex items-center gap-2 px-3 py-1 bg-primary/10 rounded-full border border-primary/20">
            <Cpu className="h-3 w-3 text-primary" />
            <span className="text-[10px] font-medium text-primary">Active</span>
          </div>
        </div>

        <CommandList className="max-h-[500px] p-4 scrollbar-hide">
          <CommandEmpty>
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-12 text-center"
            >
                <div className="relative inline-block mb-6">
                  <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
                  <Ghost className="relative mx-auto h-12 w-12 text-primary" />
                </div>
                <p className="text-xs font-medium text-muted-foreground mb-6">No results found</p>
                <Button 
                    className="bg-primary hover:bg-primary/90 text-white font-medium text-xs h-12 px-8 rounded-lg shadow-sm transition-all hover:scale-105 active:scale-95"
                    onClick={handleAskNova}
                >
                    <Sparkles className="mr-3 h-4 w-4" />
                    Authorize Nova Search: &quot;{search}&quot;
                </Button>
            </motion.div>
          </CommandEmpty>
          
          <AnimatePresence>
            {isSlashCommand && (
              <CommandGroup heading={<span className="text-xs font-medium text-primary px-2 py-4 block">Commands</span>}>
                {slashCommands.filter(c => c.command.includes(search.toLowerCase())).map((cmd) => (
                  <CommandItem 
                    key={cmd.command}
                    onSelect={() => runCommand(cmd.action)}
                    className="flex items-center gap-4 p-4 rounded-lg hover:bg-primary/10 aria-selected:bg-primary/10 cursor-pointer transition-all group mb-2"
                  >
                    <div className="h-10 w-10 bg-primary/5 rounded-lg flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                      <cmd.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold">{cmd.command}</p>
                      <p className="text-xs font-medium text-muted-foreground">{cmd.description}</p>
                    </div>
                    <CommandShortcut className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs font-medium text-muted-foreground">Shortcut</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {!isSlashCommand && search.length > 0 && (
                <CommandGroup heading={<span className="text-xs font-medium text-primary px-2 py-4 block">AI</span>}>
                    <CommandItem 
                      onSelect={handleAskNova} 
                      className="flex items-center gap-4 p-4 rounded-lg hover:bg-primary/10 aria-selected:bg-primary/10 cursor-pointer transition-all group mb-2"
                    >
                        <div className="h-10 w-10 bg-primary/10 rounded-lg flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-semibold">Ask Nova</p>
                          <p className="text-xs font-medium text-primary line-clamp-1">&quot;{search}&quot;</p>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          <span className="text-[10px] font-medium text-emerald-600">Active</span>
                        </div>
                    </CommandItem>
                </CommandGroup>
            )}

            <CommandGroup heading={<span className="text-xs font-medium text-muted-foreground px-2 py-4 block">Core Operations</span>}>
              <CommandItem 
                onSelect={() => runCommand(() => router.push("/nova"))}
                className="flex items-center gap-4 p-4 rounded-lg hover:bg-slate-500/10 aria-selected:bg-slate-500/10 cursor-pointer transition-all group mb-2"
              >
                <div className="h-10 w-10 bg-primary/5 rounded-lg flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Open Nova Chat</p>
                  <p className="text-xs font-medium text-muted-foreground">Open AI chat interface</p>
                </div>
                <CommandShortcut className="text-xs font-semibold">⌘N</CommandShortcut>
              </CommandItem>
              <CommandItem 
                onSelect={() => runCommand(() => router.push("/tasks"))}
                className="flex items-center gap-4 p-4 rounded-lg hover:bg-slate-500/10 aria-selected:bg-slate-500/10 cursor-pointer transition-all group mb-2"
              >
                <div className="h-10 w-10 bg-blue-600/5 rounded-lg flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <Plus className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-semibold">Create New Task</p>
                  <p className="text-xs font-medium text-muted-foreground">Create a new task</p>
                </div>
                <CommandShortcut className="text-xs font-semibold">⌘T</CommandShortcut>
              </CommandItem>
            </CommandGroup>
            
            <CommandSeparator className="my-2 bg-border" />
            
            <CommandGroup heading={<span className="text-xs font-medium text-muted-foreground px-2 py-4 block">Navigation</span>}>
              {[
                { label: "Dashboard", route: "/dashboard", icon: Zap, color: "text-amber-500" },
                { label: "Calendar", route: "/calendar", icon: Calendar, color: "text-primary" },
                { label: "Analytics", route: "/analytics", icon: Activity, color: "text-emerald-500" },
                { label: "Settings", route: "/settings", icon: Settings, color: "text-slate-500" },
              ].map((item) => (
                <CommandItem 
                  key={item.route}
                  onSelect={() => runCommand(() => router.push(item.route))}
                  className="flex items-center gap-4 p-4 rounded-lg hover:bg-slate-500/10 aria-selected:bg-slate-500/10 cursor-pointer transition-all group mb-2"
                >
                  <div className={cn("h-10 w-10 bg-slate-500/5 rounded-lg flex items-center justify-center group-hover:bg-slate-800 group-hover:text-white transition-all", item.color)}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-semibold">{item.label}</p>
                </CommandItem>
              ))}
            </CommandGroup>
          </AnimatePresence>
        </CommandList>
      </div>
    </CommandDialog>
  );
}

