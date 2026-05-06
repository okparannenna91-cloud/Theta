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

import { useWorkspace } from "@/hooks/use-workspace";
import { useQuery } from "@tanstack/react-query";
import { useDebounce } from "@/hooks/use-debounce";

export function CommandSearch() {
    const [open, setOpen] = React.useState(false);
    const [query, setQuery] = React.useState("");
    const debouncedQuery = useDebounce(query, 300);
    const router = useRouter();
    const { activeWorkspaceId } = useWorkspace();

    const { data: results, isLoading } = useQuery({
        queryKey: ["search", activeWorkspaceId, debouncedQuery],
        queryFn: async () => {
            if (!debouncedQuery || debouncedQuery.length < 2) return null;
            const res = await fetch(`/api/search?workspaceId=${activeWorkspaceId}&q=${debouncedQuery}`);
            if (!res.ok) throw new Error("Search failed");
            return res.json();
        },
        enabled: open && !!activeWorkspaceId && debouncedQuery.length >= 2,
    });

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
                <CommandInput 
                    placeholder="Type a command or search..." 
                    value={query}
                    onValueChange={setQuery}
                />
                <CommandList>
                    <CommandEmpty>{isLoading ? "Searching..." : "No results found."}</CommandEmpty>
                    
                    {results && (
                        <>
                            {results.projects?.length > 0 && (
                                <CommandGroup heading="Projects">
                                    {results.projects.map((p: any) => (
                                        <CommandItem key={p.id} onSelect={() => runCommand(() => router.push(`/projects/${p.id}`))}>
                                            <FolderKanban className="w-4 h-4 mr-2 text-indigo-500" />
                                            <span>{p.name}</span>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}

                            {results.tasks?.length > 0 && (
                                <CommandGroup heading="Tasks">
                                    {results.tasks.map((t: any) => (
                                        <CommandItem key={t.id} onSelect={() => runCommand(() => router.push(`/tasks/${t.id}`))}>
                                            <CheckSquare className="w-4 h-4 mr-2 text-emerald-500" />
                                            <div className="flex flex-col">
                                                <span>{t.title}</span>
                                                <span className="text-[10px] text-muted-foreground">{t.project?.name}</span>
                                            </div>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}

                            {results.members?.length > 0 && (
                                <CommandGroup heading="Members">
                                    {results.members.map((m: any) => (
                                        <CommandItem key={m.id} onSelect={() => runCommand(() => router.push(`/profile/${m.id}`))}>
                                            <Users className="w-4 h-4 mr-2 text-blue-500" />
                                            <span>{m.name}</span>
                                            <span className="ml-2 text-[10px] text-muted-foreground">({m.role})</span>
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                            )}
                        </>
                    )}

                    <CommandGroup heading="Suggestions">
                        <CommandItem onSelect={() => runCommand(() => router.push("/dashboard"))}>
                            <TrendingUp className="w-4 h-4 mr-2" />
                            <span>Dashboard</span>
                        </CommandItem>
                        <CommandItem onSelect={() => runCommand(() => router.push("/projects"))}>
                            <FolderKanban className="w-4 h-4 mr-2" />
                            <span>Projects</span>
                        </CommandItem>
                    </CommandGroup>
                    <CommandSeparator />
                    <CommandGroup heading="Settings">
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
