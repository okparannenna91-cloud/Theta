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
      description: "Initialize new task protocol",
      icon: Plus,
      action: () => router.push("/tasks"),
    },
    {
      command: "/analyze",
      description: "Run workspace diagnostic",
      icon: Activity,
      action: () => router.push("/analytics"),
    },
    {
      command: "/chat",
      description: "Open collective stream",
      icon: Cpu,
      action: () => router.push("/teams"),
    },
    {
      command: "/search",
      description: "Deep neural query",
      icon: Search,
      action: () => {}, // Handled by search state
    },
  ];

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <div className="relative overflow-hidden bg-white/80 dark:bg-slate-950/80 backdrop-blur-3xl border-indigo-500/20 rounded-[2.5rem] shadow-2xl">
        {/* Neural Background Element */}
        <div className="absolute top-0 right-0 -z-10 w-64 h-64 bg-indigo-600/10 blur-[80px] rounded-full pointer-events-none" />
        
        <div className="flex items-center border-b border-indigo-500/10 px-6 py-4">
          <Terminal className="mr-4 h-5 w-5 text-indigo-600 animate-pulse" />
          <CommandInput 
            placeholder="Type a command or ask Nova..." 
            value={search}
            onValueChange={setSearch}
            className="h-12 border-none focus:ring-0 text-lg font-black uppercase tracking-tight placeholder:text-slate-400"
          />
          <div className="flex items-center gap-2 px-3 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20">
            <Cpu className="h-3 w-3 text-indigo-600" />
            <span className="text-[8px] font-black uppercase tracking-widest text-indigo-600">Phase 1 Active</span>
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
                  <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full animate-pulse" />
                  <Ghost className="relative mx-auto h-12 w-12 text-indigo-500" />
                </div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-6">Neural Query Unresolved</p>
                <Button 
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-black uppercase tracking-widest text-[10px] h-12 px-8 rounded-2xl shadow-xl shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95"
                    onClick={handleAskNova}
                >
                    <Sparkles className="mr-3 h-4 w-4" />
                    Authorize Nova Search: &quot;{search}&quot;
                </Button>
            </motion.div>
          </CommandEmpty>
          
          <AnimatePresence>
            {isSlashCommand && (
              <CommandGroup heading={<span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 px-2 py-4 block">Deterministic Protocols</span>}>
                {slashCommands.filter(c => c.command.includes(search.toLowerCase())).map((cmd) => (
                  <CommandItem 
                    key={cmd.command}
                    onSelect={() => runCommand(cmd.action)}
                    className="flex items-center gap-4 p-4 rounded-2xl hover:bg-indigo-500/10 aria-selected:bg-indigo-500/10 cursor-pointer transition-all group mb-2"
                  >
                    <div className="h-10 w-10 bg-indigo-600/5 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                      <cmd.icon className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-black uppercase tracking-tight">{cmd.command}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{cmd.description}</p>
                    </div>
                    <CommandShortcut className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest">Protocol</CommandShortcut>
                  </CommandItem>
                ))}
              </CommandGroup>
            )}

            {!isSlashCommand && search.length > 0 && (
                <CommandGroup heading={<span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-600 px-2 py-4 block">Neural Inference</span>}>
                    <CommandItem 
                      onSelect={handleAskNova} 
                      className="flex items-center gap-4 p-4 rounded-2xl hover:bg-indigo-500/10 aria-selected:bg-indigo-500/10 cursor-pointer transition-all group mb-2"
                    >
                        <div className="h-10 w-10 bg-indigo-600/10 rounded-xl flex items-center justify-center text-indigo-600 group-hover:scale-110 transition-transform">
                          <Sparkles className="h-5 w-5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-black uppercase tracking-tight">Ask Nova</p>
                          <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest line-clamp-1 italic">&quot;{search}&quot;</p>
                        </div>
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-emerald-500/10 rounded-full border border-emerald-500/20">
                          <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          <span className="text-[8px] font-black uppercase tracking-widest text-emerald-600">AI Synced</span>
                        </div>
                    </CommandItem>
                </CommandGroup>
            )}

            <CommandGroup heading={<span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-2 py-4 block">Core Operations</span>}>
              <CommandItem 
                onSelect={() => runCommand(() => router.push("/nova"))}
                className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-500/10 aria-selected:bg-slate-500/10 cursor-pointer transition-all group mb-2"
              >
                <div className="h-10 w-10 bg-indigo-600/5 rounded-xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black uppercase tracking-tight">Open Nova Chat</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest italic">Initialize full AI stream</p>
                </div>
                <CommandShortcut className="text-[10px] font-black">⌘N</CommandShortcut>
              </CommandItem>
              <CommandItem 
                onSelect={() => runCommand(() => router.push("/tasks"))}
                className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-500/10 aria-selected:bg-slate-500/10 cursor-pointer transition-all group mb-2"
              >
                <div className="h-10 w-10 bg-blue-600/5 rounded-xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                  <Plus className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-black uppercase tracking-tight">Create New Task</p>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Execute task protocol</p>
                </div>
                <CommandShortcut className="text-[10px] font-black">⌘T</CommandShortcut>
              </CommandItem>
            </CommandGroup>
            
            <CommandSeparator className="my-2 bg-indigo-500/10" />
            
            <CommandGroup heading={<span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 px-2 py-4 block">Navigation Matrix</span>}>
              {[
                { label: "Dashboard", route: "/dashboard", icon: Zap, color: "text-amber-500" },
                { label: "Temporal Grid", route: "/calendar", icon: Calendar, color: "text-indigo-500" },
                { label: "Neural Analytics", route: "/analytics", icon: Activity, color: "text-emerald-500" },
                { label: "Identity Core", route: "/settings", icon: Settings, color: "text-slate-500" },
              ].map((item) => (
                <CommandItem 
                  key={item.route}
                  onSelect={() => runCommand(() => router.push(item.route))}
                  className="flex items-center gap-4 p-4 rounded-2xl hover:bg-slate-500/10 aria-selected:bg-slate-500/10 cursor-pointer transition-all group mb-2"
                >
                  <div className={cn("h-10 w-10 bg-slate-500/5 rounded-xl flex items-center justify-center group-hover:bg-slate-800 group-hover:text-white transition-all", item.color)}>
                    <item.icon className="h-5 w-5" />
                  </div>
                  <p className="text-sm font-black uppercase tracking-tight">{item.label}</p>
                </CommandItem>
              ))}
            </CommandGroup>
          </AnimatePresence>
        </CommandList>
      </div>
    </CommandDialog>
  );
}

