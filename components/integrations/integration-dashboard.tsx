"use client";

import React, { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import {
    Github,
    Trello,
    Briefcase,
    ShoppingCart,
    Layout,
    ExternalLink,
    RefreshCw,
    Trash2,
    CheckCircle2,
    AlertCircle,
    Plus,
    CloudLightning,
    Hash,
    Link2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
    CardFooter
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/use-workspace";
import { usePopups } from "@/components/popups/popup-manager";
import { FadeIn, ScaleIn } from "@/components/common/motion-wrapper";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface IntegrationRecord {
    id: string;
    provider: string;
    type?: string;
    updatedAt: string;
    config: any;
}

const PROVIDERS = [
    {
        id: "github",
        name: "GitHub",
        description: "Sync repositories, fetch commits, and automate task tracking.",
        icon: Github,
        color: "#24292e",
        gradient: "from-zinc-900 to-zinc-700",
        canSync: true,
    },
    {
        id: "bitbucket",
        name: "Bitbucket",
        description: "Integration for repos and pull request synchronization.",
        icon: CloudLightning,
        color: "#0052CC",
        gradient: "from-blue-600 to-blue-400",
        canSync: true,
    },
    {
        id: "asana",
        name: "Asana",
        description: "Import projects and keep tasks in sync across platforms.",
        icon: Briefcase,
        color: "#F06A6A",
        gradient: "from-rose-500 to-rose-400",
        canSync: true,
    },
    {
        id: "trello",
        name: "Trello",
        description: "Convert Trello cards to tasks and sync board statuses.",
        icon: Trello,
        color: "#0079BF",
        gradient: "from-sky-600 to-sky-400",
        canSync: true,
    },
    {
        id: "woocommerce",
        name: "WooCommerce",
        description: "Fetch products and sync webshop orders to your dashboard.",
        icon: ShoppingCart,
        color: "#96588A",
        gradient: "from-purple-600 to-purple-400",
        canSync: true,
    },
    {
        id: "figma",
        name: "Figma",
        description: "Embed live Figma files directly into your project views.",
        icon: Layout,
        color: "#F24E1E",
        gradient: "from-orange-500 to-pink-500",
        canSync: false,
        linkOnly: true,
    },
    {
        id: "canva",
        name: "Canva",
        description: "Quickly access and view your Canva designs in one click.",
        icon: Hash,
        color: "#00C4CC",
        gradient: "from-cyan-500 to-teal-400",
        canSync: false,
        linkOnly: true,
    },
];

export default function IntegrationDashboard() {
    const { activeWorkspaceId } = useWorkspace();
    const { showUpgradePrompt } = usePopups();
    const [integrations, setIntegrations] = useState<IntegrationRecord[]>([]);
    const [limits, setLimits] = useState<{ max: number; current: number; hasAccess: boolean }>({ max: 0, current: 0, hasAccess: false });
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState<string | null>(null);
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [selectedManualProvider, setSelectedManualProvider] = useState<any>(null);
    const [manualInputs, setManualInputs] = useState<any>({});

    const fetchIntegrations = useCallback(async () => {
        try {
            setIsLoading(true);
            const res = await fetch(`/api/integrations?workspaceId=${activeWorkspaceId}`);
            const data = await res.json();
            if (data.integrations) {
                setIntegrations(data.integrations);
                setLimits(data.limits);
            } else {
                setIntegrations([]);
            }
        } catch (error) {
            console.error("Failed to fetch integrations:", error);
        } finally {
            setIsLoading(false);
        }
    }, [activeWorkspaceId]);

    useEffect(() => {
        if (activeWorkspaceId) {
            fetchIntegrations();
        }
    }, [activeWorkspaceId, fetchIntegrations]);

    const isLimitReached = limits.max !== -1 && limits.current >= limits.max;

    const handleConnect = (providerId: string) => {
        if (!activeWorkspaceId) return;

        // Proactive Plan Limit Check
        if (isLimitReached) {
            showUpgradePrompt("integrations");
            return;
        }

        // Figma and Canva are link-based for MVP
        const provider = PROVIDERS.find(p => p.id === providerId);
        if (provider?.linkOnly || providerId === "trello" || providerId === "woocommerce") {
            setSelectedManualProvider(provider);
            setManualInputs({});
            setIsManualModalOpen(true);
            return;
        }

        const connectUrl = `/api/integrations/${providerId}/connect?workspaceId=${activeWorkspaceId}`;
        window.open(connectUrl, "_blank", "width=600,height=700");

        toast.info(`Initializing ${providerId} connection...`);
    };

    const handleManualSubmit = async () => {
        if (!activeWorkspaceId || !selectedManualProvider) return;

        // Proactive Plan Limit Check
        if (isLimitReached) {
            showUpgradePrompt("integrations");
            return;
        }

        try {
            const res = await fetch(`/api/integrations/${selectedManualProvider.id}/connect`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    workspaceId: activeWorkspaceId,
                    ...manualInputs
                })
            });

            if (res.ok) {
                toast.success(`${selectedManualProvider.name} connected successfully.`);
                setIsManualModalOpen(false);
                fetchIntegrations();
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to connect.");
            }
        } catch (error) {
            toast.error("An error occurred during connection.");
        }
    };

    const handleDisconnect = async (id: string, providerName: string) => {
        if (!confirm(`Are you sure you want to disconnect ${providerName}?`)) return;

        try {
            const res = await fetch(`/api/integrations?id=${id}&workspaceId=${activeWorkspaceId}`, {
                method: "DELETE"
            });
            if (res.ok) {
                toast.success(`${providerName} disconnected.`);
                fetchIntegrations();
            }
        } catch (error) {
            toast.error("Failed to disconnect integration.");
        }
    };

    const handleSync = async (providerId: string) => {
        setIsSyncing(providerId);
        try {
            const res = await fetch("/api/integrations/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ provider: providerId, workspaceId: activeWorkspaceId })
            });
            const data = await res.json();
            if (data.success) {
                toast.success(`Data synced from ${providerId}. Found ${data.count} items.`);
                fetchIntegrations();
            } else {
                toast.error(`Sync failed: ${data.error}`);
            }
        } catch (error) {
            toast.error("Failed to sync integration.");
        } finally {
            setIsSyncing(null);
        }
    };

    if (isLoading) {
        return (
            <div className="space-y-6 py-6">
                <Skeleton className="h-14 w-full rounded-2xl" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {Array.from({ length: 6 }).map((_, i) => (
                        <div key={i} className="glass-card rounded-xl p-6 space-y-5">
                            <div className="flex items-center gap-5">
                                <Skeleton className="h-16 w-16 rounded-2xl" />
                                <div className="flex-1 space-y-2">
                                    <Skeleton className="h-5 w-28" />
                                    <Skeleton className="h-3 w-20" />
                                </div>
                            </div>
                            <Skeleton className="h-4 w-full" />
                            <Skeleton className="h-4 w-3/4" />
                            <Skeleton className="h-11 w-full rounded-2xl" />
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 py-6">
            {!isLoading && limits.max !== -1 && (
                <div className={cn(
                    "p-4 rounded-2xl border flex items-center justify-between",
                    isLimitReached ? "bg-rose-500/10 border-rose-500/20" : "bg-primary/5 border-primary/10"
                )}>
                    <div className="flex items-center gap-3">
                        {isLimitReached ? <AlertCircle className="h-5 w-5 text-rose-500" /> : <CloudLightning className="h-5 w-5 text-primary" />}
                        <div>
                            <p className="text-sm font-bold">Integration Usage: {limits.current} / {limits.max}</p>
                            <p className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
                                {isLimitReached ? "Limit reached. Upgrade for more connections." : `You have ${limits.max - limits.current} connections remaining.`}
                            </p>
                        </div>
                    </div>
                    {isLimitReached && (
                        <Button 
                            size="sm" 
                            variant="outline" 
                            className="rounded-xl font-bold text-[10px] h-8 uppercase"
                            onClick={() => showUpgradePrompt("integrations")}
                        >
                            Upgrade Plan
                        </Button>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {PROVIDERS.map((provider) => {
                    const integration = integrations.find(
                        item => item.provider === provider.id || (provider.id === 'slack' && item.type === 'slack')
                    );
                    const isConnected = !!integration;

                    return (
                        <FadeIn key={provider.id}>
                            <Card className="glass-card border-none hover:shadow-xl transition-all duration-500 group overflow-hidden flex flex-col h-full">
                                <div className={`absolute top-0 right-0 w-32 h-32 bg-${provider.id}-500/5 blur-3xl -z-10`} />

                                <CardHeader className="flex flex-row items-center gap-5 space-y-0 p-6">
                                    <div
                                        className={`p-4 rounded-2xl transition-all duration-500 group-hover:scale-110 shadow-lg`}
                                        style={{ backgroundColor: isConnected ? provider.color : `${provider.color}15` }}
                                    >
                                        <provider.icon className={`h-8 w-8 transition-colors duration-500 ${isConnected ? "text-white" : ""}`} style={{ color: isConnected ? "#fff" : provider.color }} />
                                    </div>
                                    <div className="flex-1">
                                        <CardTitle className="text-xl font-black tracking-tight flex items-center gap-2">
                                            {provider.name}
                                            {isConnected && (
                                                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                                            )}
                                        </CardTitle>
                                        <CardDescription className="font-bold text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                                            {isConnected ? "Active Connector" : "Available Extension"}
                                        </CardDescription>
                                    </div>
                                </CardHeader>

                                <CardContent className="px-6 py-0 flex-1">
                                    <p className="text-sm text-muted-foreground font-medium leading-relaxed">
                                        {provider.description}
                                    </p>

                                    {isConnected && (
                                        <div className="mt-4 p-3 bg-white/5 rounded-xl border border-white/10 flex items-center justify-between">
                                            <span className="text-[10px] font-bold text-muted-foreground uppercase">Last Sync</span>
                                            <span className="text-[10px] font-black">{new Date(integration.updatedAt).toLocaleDateString()}</span>
                                        </div>
                                    )}
                                </CardContent>

                                <CardFooter className="p-6 gap-3">
                                    {isConnected ? (
                                        <>
                                            {provider.canSync && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="rounded-xl bg-primary/10 hover:bg-primary/20 text-primary"
                                                    onClick={() => handleSync(provider.id)}
                                                    disabled={isSyncing === provider.id}
                                                >
                                                    <RefreshCw className={`h-4 w-4 ${isSyncing === provider.id ? "animate-spin" : ""}`} />
                                                </Button>
                                            )}
                                            <Button
                                                variant="ghost"
                                                className="flex-1 rounded-xl h-11 font-black uppercase tracking-widest text-[10px] border border-white/10"
                                                onClick={() => handleConnect(provider.id)}
                                            >
                                                Settings
                                            </Button>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="rounded-xl hover:bg-rose-500/10 text-rose-500"
                                                onClick={() => handleDisconnect(integration.id, provider.name)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            className={cn(
                                                "w-full rounded-2xl h-11 font-black uppercase tracking-[0.2em] text-[10px] transition-all duration-300",
                                                isLimitReached ? "opacity-50 cursor-not-allowed bg-slate-200 text-slate-500" : "bg-primary hover:primary/90 text-white shadow-lg shadow-primary/20 hover:scale-[1.02]"
                                            )}
                                            onClick={() => handleConnect(provider.id)}
                                            disabled={isLimitReached && !provider.linkOnly}
                                        >
                                            {isLimitReached && !provider.linkOnly ? "Limit Reached" : "Authorize Connector"}
                                        </Button>
                                    )}
                                </CardFooter>
                            </Card>
                        </FadeIn>
                    );
                })}

                {/* Help Card */}
                <FadeIn>
                    <Card className="glass-card border-dashed border-2 border-white/10 bg-transparent flex flex-col items-center justify-center p-8 text-center h-full min-h-[280px]">
                        <div className="p-4 bg-white/5 rounded-full mb-4">
                            <Link2 className="h-8 w-8 text-muted-foreground opacity-50" />
                        </div>
                        <h3 className="text-lg font-black tracking-tight mb-2">Request Integration</h3>
                        <p className="text-xs text-muted-foreground font-medium mb-6">Need a custom provider? We develop new connectors every week.</p>
                        <Button variant="outline" className="rounded-xl font-bold text-[10px] uppercase tracking-widest">
                            Contact Support
                        </Button>
                    </Card>
                </FadeIn>
            </div>

            <Dialog open={isManualModalOpen} onOpenChange={setIsManualModalOpen}>
                <DialogContent className="glass-card border-none sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-black flex items-center gap-3">
                            Connect {selectedManualProvider?.name}
                        </DialogTitle>
                        <DialogDescription className="font-medium text-muted-foreground">
                            {selectedManualProvider?.id === 'trello' && "Enter your Personal Trello Token to sync boards."}
                            {selectedManualProvider?.id === 'woocommerce' && "Link your WooCommerce store via REST API keys."}
                            {selectedManualProvider?.id === 'figma' && "Add your Figma file URL to enable live embeds."}
                            {selectedManualProvider?.id === 'canva' && "Store your Canva design link for quick access."}
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-6 py-6 font-bold uppercase tracking-wider text-[10px]">
                        {selectedManualProvider?.id === 'trello' && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Developer Key (Optional)</Label>
                                    <Input
                                        placeholder="Trello API Key"
                                        className="h-12 rounded-xl bg-white/5 border-white/10"
                                        value={manualInputs.apiKey || ""}
                                        onChange={(e) => setManualInputs({ ...manualInputs, apiKey: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Member Token</Label>
                                    <Input
                                        type="password"
                                        placeholder="Secret Token"
                                        className="h-12 rounded-xl bg-white/5 border-white/10"
                                        value={manualInputs.token || ""}
                                        onChange={(e) => setManualInputs({ ...manualInputs, token: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}
                        {selectedManualProvider?.id === 'woocommerce' && (
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <Label>Store URL</Label>
                                    <Input
                                        placeholder="https://your-store.com"
                                        className="h-12 rounded-xl bg-white/5 border-white/10"
                                        value={manualInputs.siteUrl || ""}
                                        onChange={(e) => setManualInputs({ ...manualInputs, siteUrl: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Consumer Key</Label>
                                    <Input
                                        placeholder="ck_..."
                                        className="h-12 rounded-xl bg-white/5 border-white/10"
                                        value={manualInputs.consumerKey || ""}
                                        onChange={(e) => setManualInputs({ ...manualInputs, consumerKey: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Consumer Secret</Label>
                                    <Input
                                        type="password"
                                        placeholder="cs_..."
                                        className="h-12 rounded-xl bg-white/5 border-white/10"
                                        value={manualInputs.consumerSecret || ""}
                                        onChange={(e) => setManualInputs({ ...manualInputs, consumerSecret: e.target.value })}
                                    />
                                </div>
                            </div>
                        )}
                        {(selectedManualProvider?.id === 'figma' || selectedManualProvider?.id === 'canva') && (
                            <div className="space-y-2">
                                <Label>{selectedManualProvider?.name} File/Design URL</Label>
                                <Input
                                    placeholder="https://..."
                                    className="h-12 rounded-xl bg-white/5 border-white/10"
                                    value={manualInputs.config_url || ""}
                                    onChange={(e) => setManualInputs({ ...manualInputs, config_url: e.target.value })}
                                />
                            </div>
                        )}
                    </div>
                    <DialogFooter>
                        <Button
                            className="w-full h-12 rounded-2xl font-black uppercase tracking-widest text-xs"
                            onClick={handleManualSubmit}
                        >
                            Confirm Connection
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
