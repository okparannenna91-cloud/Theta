"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useWorkspace } from "@/hooks/use-workspace";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Zap, ArrowRight, CheckCircle2, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";
import {
    GitHubLogo, BitbucketLogo, SlackLogo, AsanaLogo,
    TrelloLogo, FigmaLogo, CanvaLogo, WooCommerceLogo
} from "@/components/apps/app-logos";

const QUICK_APPS = [
    { id: "github",      name: "GitHub",       Logo: GitHubLogo,      bg: "bg-zinc-900" },
    { id: "slack",       name: "Slack",         Logo: SlackLogo,       bg: "bg-white border" },
    { id: "figma",       name: "Figma",         Logo: FigmaLogo,       bg: "bg-black" },
    { id: "trello",      name: "Trello",        Logo: TrelloLogo,      bg: "bg-[#0079BF]" },
    { id: "asana",       name: "Asana",         Logo: AsanaLogo,       bg: "bg-[#ffe3de]" },
    { id: "woocommerce", name: "WooCommerce",   Logo: WooCommerceLogo, bg: "bg-[#96588A]" },
    { id: "bitbucket",   name: "Bitbucket",     Logo: BitbucketLogo,   bg: "bg-[#0052CC]" },
    { id: "canva",       name: "Canva",         Logo: CanvaLogo,       bg: "bg-[#00C4CC]" },
];

export function AppsDropdown() {
    const [isOpen, setIsOpen] = useState(false);
    const { activeWorkspaceId } = useWorkspace();

    const { data } = useQuery({
        queryKey: ["integrations", activeWorkspaceId],
        queryFn: async () => {
            if (!activeWorkspaceId) return { integrations: [] };
            const res = await fetch(`/api/integrations?workspaceId=${activeWorkspaceId}`);
            if (!res.ok) return { integrations: [] };
            return res.json();
        },
        enabled: !!activeWorkspaceId,
    });

    const integrations: any[] = Array.isArray(data?.integrations) ? data.integrations : [];
    const isConnected = (id: string) => integrations.some((i: any) => i.provider === id);
    const connectedApps = QUICK_APPS.filter(a => isConnected(a.id));
    const suggestedApps = QUICK_APPS.filter(a => !isConnected(a.id)).slice(0, 3);

    return (
        <Popover open={isOpen} onOpenChange={setIsOpen}>
            <PopoverTrigger asChild>
                <Button variant="ghost" size="sm"
                    className="relative h-9 px-3 gap-2 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-800 transition-all">
                    <Zap className="h-4 w-4" />
                    Apps
                    {connectedApps.length > 0 && (
                        <span className="absolute -top-0.5 -right-0.5 h-4 min-w-[16px] flex items-center justify-center bg-indigo-600 text-[9px] font-black text-white px-1 rounded-full border-2 border-white dark:border-slate-900">
                            {connectedApps.length}
                        </span>
                    )}
                </Button>
            </PopoverTrigger>

            <PopoverContent align="end" sideOffset={8}
                className="w-72 p-0 rounded-2xl border-none shadow-2xl overflow-hidden bg-white dark:bg-slate-900">

                {/* Header */}
                <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/20">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Zap className="h-4 w-4 text-indigo-500" />
                            <span className="text-xs font-black uppercase tracking-widest">Apps</span>
                        </div>
                        <Badge variant="secondary" className="text-[9px] font-black uppercase tracking-widest">
                            {connectedApps.length} Active
                        </Badge>
                    </div>
                </div>

                <div className="p-3 space-y-4 max-h-[400px] overflow-y-auto">

                    {/* Connected */}
                    {connectedApps.length > 0 && (
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 px-1 mb-2">Connected Apps</p>
                            <div className="space-y-1">
                                {connectedApps.map(app => {
                                    const Logo = app.Logo;
                                    return (
                                        <Link key={app.id} href="/apps" onClick={() => setIsOpen(false)}>
                                            <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer">
                                                <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm", app.bg)}>
                                                    <Logo size={18} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold truncate">{app.name}</p>
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                                                        <span className="text-[9px] text-emerald-600 font-bold uppercase tracking-wider">Connected</span>
                                                    </div>
                                                </div>
                                                <ArrowRight className="h-3 w-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {connectedApps.length > 0 && suggestedApps.length > 0 && (
                        <div className="border-t border-slate-100 dark:border-slate-800" />
                    )}

                    {/* Suggested */}
                    {suggestedApps.length > 0 && (
                        <div>
                            <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground px-1 mb-2">
                                {connectedApps.length === 0 ? "Discover Apps" : "Suggested"}
                            </p>
                            <div className="space-y-1">
                                {suggestedApps.map(app => {
                                    const Logo = app.Logo;
                                    return (
                                        <Link key={app.id} href="/apps" onClick={() => setIsOpen(false)}>
                                            <div className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer">
                                                <div className={cn("h-8 w-8 rounded-xl flex items-center justify-center flex-shrink-0 shadow-sm opacity-70", app.bg)}>
                                                    <Logo size={18} />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <p className="text-xs font-bold truncate">{app.name}</p>
                                                    <div className="flex items-center gap-1 mt-0.5">
                                                        <Circle className="h-3 w-3 text-slate-400" />
                                                        <span className="text-[9px] text-muted-foreground font-bold uppercase tracking-wider">Not Connected</span>
                                                    </div>
                                                </div>
                                                <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">Connect</span>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-3 border-t border-slate-100 dark:border-slate-800">
                    <Link href="/apps" onClick={() => setIsOpen(false)}>
                        <Button className="w-full rounded-xl text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500">
                            <Zap className="h-3.5 w-3.5 mr-2" />
                            View All Apps
                        </Button>
                    </Link>
                </div>
            </PopoverContent>
        </Popover>
    );
}
