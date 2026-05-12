"use client";

import * as React from "react";
import {
  Calculator,
  Calendar,
  CreditCard,
  Settings,
  Smile,
  User,
  Search,
  Sparkles,
  Plus,
  MessageSquare,
  FileText,
  Zap,
} from "lucide-react";
import { Command, CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator, CommandShortcut } from "@/components/ui/command";
import { useRouter } from "next/navigation";

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

  return (
    <CommandDialog open={open} onOpenChange={setOpen}>
      <CommandInput 
        placeholder="Type a command or ask Nova..." 
        value={search}
        onValueChange={setSearch}
      />
      <CommandList className="max-h-[450px]">
        <CommandEmpty>
            <div className="py-6 text-center">
                <Sparkles className="mx-auto h-8 w-8 text-indigo-500 animate-pulse mb-4" />
                <p className="text-sm font-medium text-slate-500">No command found.</p>
                <Button 
                    variant="ghost" 
                    className="mt-4 text-indigo-600 font-bold hover:text-indigo-700"
                    onClick={handleAskNova}
                >
                    Ask Nova: "{search}"
                </Button>
            </div>
        </CommandEmpty>
        
        {search.length > 0 && (
            <CommandGroup heading="AI Intelligence">
                <CommandItem onSelect={handleAskNova} className="cursor-pointer">
                    <Sparkles className="mr-2 h-4 w-4 text-indigo-500" />
                    <span>Ask Nova: <span className="font-bold text-indigo-600">"{search}"</span></span>
                </CommandItem>
            </CommandGroup>
        )}

        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => runCommand(() => router.push("/nova"))}>
            <Sparkles className="mr-2 h-4 w-4 text-purple-500" />
            <span>Open Nova Chat</span>
            <CommandShortcut>⌘N</CommandShortcut>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/boards"))}>
            <Plus className="mr-2 h-4 w-4 text-blue-500" />
            <span>Create New Task</span>
            <CommandShortcut>⌘T</CommandShortcut>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
            <Zap className="mr-2 h-4 w-4" />
            <span>Dashboard</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/projects"))}>
            <FileText className="mr-2 h-4 w-4" />
            <span>Projects</span>
          </CommandItem>
          <CommandItem onSelect={() => runCommand(() => router.push("/tasks"))}>
            <Calendar className="mr-2 h-4 w-4" />
            <span>Tasks</span>
          </CommandItem>
        </CommandGroup>
        <CommandSeparator />
        <CommandGroup heading="Settings">
          <CommandItem onSelect={() => runCommand(() => router.push("/settings"))}>
            <Settings className="mr-2 h-4 w-4" />
            <span>Settings</span>
            <CommandShortcut>⌘S</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
