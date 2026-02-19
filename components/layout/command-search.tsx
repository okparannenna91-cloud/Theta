"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
    Calculator,
    Calendar,
    CreditCard,
    Settings,
    Smile,
    User,
    Search,
    CheckSquare,
    FolderKanban,
    Columns,
    Users,
    Bell,
    TrendingUp,
} from "lucide-react";

import {
    CommandDialog,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
    CommandShortcut,
} from "@/components/ui/command";

export function CommandSearch() {
    const [open, setOpen] = React.useState(false);
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

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="relative inline-flex items-center justify-start px-3 py-2 text-sm font-medium transition-colors border rounded-md bg-muted/40 hover:bg-muted/80 text-muted-foreground w-full md:w-64"
            >
                <Search className="w-4 h-4 mr-2" />
                <span>Search...</span>
                <kbd className="pointer-events-none absolute right-1.5 top-2 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
                    <span className="text-xs">⌘</span>K
                </kbd>
            </button>
            <CommandDialog open={open} onOpenChange={setOpen}>
                <CommandInput placeholder="Type a command or search..." />
                <CommandList>
                    <CommandEmpty>No results found.</CommandEmpty>
                    <CommandGroup heading="Suggestions">
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
                            <Search className="w-4 h-4 mr-2" />
                            <span>Dashboard</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/projects"))}>
                            <FolderKanban className="w-4 h-4 mr-2" />
                            <span>Projects</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/tasks"))}>
                            <CheckSquare className="w-4 h-4 mr-2" />
                            <span>Tasks</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/calendar"))}>
                            <Calendar className="w-4 h-4 mr-2" />
                            <span>Calendar</span>
                        </CommandItem>
                        <CommandGroup heading="Analytics">
                            <CommandItem onSelect={() => runCommand(() => router.push("/analytics"))}>
                                <TrendingUp className="w-4 h-4 mr-2" />
                                <span>View Analytics Dashboard</span>
                            </CommandItem>
                        </CommandGroup>
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Settings">
                        <CommandItem onSelect={() => runCommand(() => router.push("/profile"))}>
                            <User className="w-4 h-4 mr-2" />
                            <span>Profile</span>
                            <CommandShortcut>⌘P</CommandShortcut>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/billing"))}>
                            <CreditCard className="w-4 h-4 mr-2" />
                            <span>Billing</span>
                            <CommandShortcut>⌘B</CommandShortcut>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/settings"))}>
                            <Settings className="w-4 h-4 mr-2" />
                            <span>Settings</span>
                            <CommandShortcut>⌘S</CommandShortcut>
                        </CommandItem>
                    </CommandGroup>
                </CommandList>
            </CommandDialog>
        </>
    );
}
