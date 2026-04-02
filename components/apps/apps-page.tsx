"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Github, ShoppingCart, Layout, ExternalLink, RefreshCw,
    Trash2, CheckCircle2, Plus, CloudLightning, Hash, Link2,
    Search, Zap, Briefcase, Trello, X, ArrowRight, Layers
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/use-workspace";
import { cn } from "@/lib/utils";

const CATEGORIES = ["All", "Communication", "Development", "Design", "Productivity", "E-commerce"];

const PROVIDERS = [
    {
        id: "github", name: "GitHub", category: "Development",
        description: "Sync repositories, fetch commits, and automate task tracking directly from your codebase.",
        icon: Github, color: "#24292e", bg: "bg-zinc-900",
        gradient: "from-zinc-900 to-zinc-700", canSync: true,
        badge: "Popular",
    },
    {
        id: "bitbucket", name: "Bitbucket", category: "Development",
        description: "Sync repositories and pull request data for complete dev workflow automation.",
        icon: CloudLightning, color: "#0052CC", bg: "bg-blue-600",
        gradient: "from-blue-600 to-blue-400", canSync: true, badge: null,
    },
    {
        id: "slack", name: "Slack", category: "Communication",
        description: "Send real-time notifications, task updates, and alerts directly to your Slack workspace.",
        icon: Hash, color: "#4A154B", bg: "bg-purple-800",
        gradient: "from-purple-800 to-pink-600", canSync: false, linkOnly: true, badge: "Popular",
    },
    {
        id: "asana", name: "Asana", category: "Productivity",
        description: "Import projects and keep tasks in sync across platforms seamlessly.",
        icon: Briefcase, color: "#F06A6A", bg: "bg-rose-500",
        gradient: "from-rose-500 to-rose-400", canSync: true, badge: null,
    },
    {
        id: "trello", name: "Trello", category: "Productivity",
        description: "Convert Trello cards to tasks and sync board statuses automatically.",
        icon: Trello as any, color: "#0079BF", bg: "bg-sky-600",
        gradient: "from-sky-600 to-sky-400", canSync: true, badge: null,
    },
    {
        id: "figma", name: "Figma", category: "Design",
        description: "Embed live Figma files directly into your project views for seamless design handoff.",
        icon: Layout, color: "#F24E1E", bg: "bg-orange-500",
        gradient: "from-orange-500 to-pink-500", canSync: false, linkOnly: true, badge: "New",
    },
    {
        id: "canva", name: "Canva", category: "Design",
        description: "Access and share your Canva designs directly within your project workspace.",
        icon: Layers, color: "#00C4CC", bg: "bg-cyan-500",
        gradient: "from-cyan-500 to-teal-400", canSync: false, linkOnly: true, badge: null,
    },
    {
        id: "woocommerce", name: "WooCommerce", category: "E-commerce",
        description: "Fetch products and sync webshop orders to your project dashboard in real-time.",
        icon: ShoppingCart, color: "#96588A", bg: "bg-purple-600",
        gradient: "from-purple-600 to-purple-400", canSync: true, badge: null,
    },
];

interface IntegrationRecord {
    id: string; provider: string; updatedAt: string; config: any;
}

export default function AppsPage() {
    const { activeWorkspaceId } = useWorkspace();
    const [integrations, setIntegrations] = useState<IntegrationRecord[]>([]);
    const [limits, setLimits] = useState<{ max: number; current: number; hasAccess: boolean }>({ max: 0, current: 0, hasAccess: false });
    const [isLoading, setIsLoading] = useState(true);
    const [isSyncing, setIsSyncing] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeCategory, setActiveCategory] = useState("All");
    const [statusFilter, setStatusFilter] = useState<"all" | "connected" | "not_connected">("all");
    const [selectedProvider, setSelectedProvider] = useState<any>(null);
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isManualOpen, setIsManualOpen] = useState(false);
    const [manualInputs, setManualInputs] = useState<any>({});

    const fetchIntegrations = useCallback(async () => {
        if (!activeWorkspaceId) return;
        try {
            setIsLoading(true);
            const res = await fetch(`/api/integrations?workspaceId=${activeWorkspaceId}`);
            const data = await res.json();
            setIntegrations(Array.isArray(data.integrations) ? data.integrations : []);
            if (data.limits) setLimits(data.limits);
        } catch { setIntegrations([]); }
        finally { setIsLoading(false); }
    }, [activeWorkspaceId]);

    useEffect(() => { fetchIntegrations(); }, [fetchIntegrations]);

    const isConnected = (id: string) => integrations.some(i => i.provider === id);
    const getRecord = (id: string) => integrations.find(i => i.provider === id);

    const filteredProviders = useMemo(() => {
        return PROVIDERS.filter(p => {
            const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchCat = activeCategory === "All" || p.category === activeCategory;
            const matchStatus = statusFilter === "all"
                ? true : statusFilter === "connected"
                ? isConnected(p.id) : !isConnected(p.id);
            return matchSearch && matchCat && matchStatus;
        });
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [searchQuery, activeCategory, statusFilter, integrations]);

    const connectedApps = PROVIDERS.filter(p => isConnected(p.id));

    const handleConnect = (provider: any) => {
        if (!activeWorkspaceId) return;
        if (provider.linkOnly || provider.id === "trello" || provider.id === "woocommerce" || provider.id === "slack") {
            setSelectedProvider(provider);
            setManualInputs({});
            setIsManualOpen(true);
            setIsDetailOpen(false);
            return;
        }
        const url = `/api/integrations/${provider.id}/connect?workspaceId=${activeWorkspaceId}`;
        window.open(url, "_blank", "width=600,height=700");
        toast.info(`Connecting to ${provider.name}...`);
    };

    const handleManualSubmit = async () => {
        if (!activeWorkspaceId || !selectedProvider) return;
        try {
            const res = await fetch(`/api/integrations/${selectedProvider.id}/connect`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workspaceId: activeWorkspaceId, ...manualInputs })
            });
            if (res.ok) {
                toast.success(`${selectedProvider.name} connected!`);
                setIsManualOpen(false);
                fetchIntegrations();
            } else {
                const data = await res.json();
                toast.error(data.error || "Failed to connect.");
            }
        } catch { toast.error("Connection failed. Try again."); }
    };

    const handleDisconnect = async (provider: any) => {
        const record = getRecord(provider.id);
        if (!record || !activeWorkspaceId) return;
        try {
            await fetch(`/api/integrations?id=${record.id}&workspaceId=${activeWorkspaceId}`, { method: "DELETE" });
            toast.success(`${provider.name} disconnected.`);
            fetchIntegrations();
            setIsDetailOpen(false);
        } catch { toast.error("Failed to disconnect."); }
    };

    const handleSync = async (provider: any) => {
        if (!activeWorkspaceId) return;
        setIsSyncing(provider.id);
        try {
            const res = await fetch(`/api/integrations/sync?workspaceId=${activeWorkspaceId}&provider=${provider.id}`, { method: "POST" });
            if (res.ok) toast.success(`${provider.name} synced!`);
            else toast.error("Sync failed.");
        } catch { toast.error("Sync error."); }
        finally { setIsSyncing(null); }
    };

    const openDetail = (provider: any) => {
        setSelectedProvider(provider);
        setIsDetailOpen(true);
    };

    return (
        <div className="p-4 sm:p-6 lg:p-10 max-w-7xl mx-auto space-y-10 pb-20">

            {/* Header */}
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row items-start sm:items-end justify-between gap-6">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                            <Zap className="h-6 w-6 text-white" />
                        </div>
                        <h1 className="text-4xl font-black uppercase tracking-tight">Apps & Integrations</h1>
                    </div>
                    <p className="text-muted-foreground font-medium ml-15">Connect your tools to supercharge your workflow.</p>
                </div>
                <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full border bg-white dark:bg-slate-900 shadow-sm">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    {connectedApps.length} Connected
                </div>
            </motion.div>

            {/* Connected Apps Summary Bar */}
            {connectedApps.length > 0 && (
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    className="p-4 rounded-3xl bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-indigo-950/30 dark:to-purple-950/20 border border-indigo-100 dark:border-indigo-900/30">
                    <p className="text-xs font-black uppercase tracking-widest text-indigo-600 mb-3">Active Connections</p>
                    <div className="flex items-center gap-3 flex-wrap">
                        {connectedApps.map(p => (
                            <button key={p.id} onClick={() => openDetail(p)}
                                className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-indigo-200 dark:border-indigo-800 shadow-sm hover:scale-105 transition-transform">
                                <div className={cn("h-5 w-5 rounded-full flex items-center justify-center", p.bg)}>
                                    <p.icon className="h-3 w-3 text-white" />
                                </div>
                                <span className="text-xs font-bold">{p.name}</span>
                                <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            </button>
                        ))}
                    </div>
                </motion.div>
            )}

            {/* Search + Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
                <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search apps..." className="pl-9 rounded-xl bg-white dark:bg-slate-900 border-slate-200/50 shadow-sm"
                        value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                    {(["all", "connected", "not_connected"] as const).map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)}
                            className={cn("px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
                                statusFilter === s ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30" : "bg-white dark:bg-slate-900 border text-muted-foreground hover:border-indigo-300")}>
                            {s === "not_connected" ? "Not Connected" : s === "connected" ? "Connected" : "All Apps"}
                        </button>
                    ))}
                </div>
            </div>

            {/* Category Pills */}
            <div className="flex gap-2 overflow-x-auto pb-1 -mt-6">
                {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setActiveCategory(cat)}
                        className={cn("px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest whitespace-nowrap transition-all",
                            activeCategory === cat ? "bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md" : "bg-white dark:bg-slate-900 border text-muted-foreground hover:border-slate-400")}>
                        {cat}
                    </button>
                ))}
            </div>

            {/* App Grid */}
            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="h-52 rounded-3xl" />)}
                </div>
            ) : filteredProviders.length === 0 ? (
                <div className="py-24 flex flex-col items-center justify-center text-center bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border-2 border-dashed">
                    <Zap className="h-12 w-12 text-slate-300 mb-4" />
                    <h3 className="text-lg font-black uppercase tracking-tight mb-2">No Apps Found</h3>
                    <p className="text-muted-foreground font-medium">Try adjusting your search or filters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    <AnimatePresence>
                        {filteredProviders.map((provider, i) => {
                            const connected = isConnected(provider.id);
                            const Icon = provider.icon;
                            return (
                                <motion.div key={provider.id}
                                    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: i * 0.04 }}>
                                    <Card onClick={() => openDetail(provider)}
                                        className="group cursor-pointer hover:shadow-2xl hover:-translate-y-1 transition-all duration-300 border-slate-200/50 dark:border-slate-800/50 rounded-3xl overflow-hidden relative bg-white dark:bg-slate-900">
                                        {/* Status indicator */}
                                        <div className={cn("absolute top-4 right-4 h-2.5 w-2.5 rounded-full shadow-sm",
                                            connected ? "bg-emerald-500 shadow-emerald-500/50" : "bg-slate-300 dark:bg-slate-600")} />
                                        {provider.badge && (
                                            <div className="absolute top-4 left-4">
                                                <Badge className={cn("text-[9px] font-black uppercase tracking-widest px-2",
                                                    provider.badge === "New" ? "bg-emerald-500 text-white" : "bg-indigo-600 text-white")}>
                                                    {provider.badge}
                                                </Badge>
                                            </div>
                                        )}
                                        <CardContent className="p-6 pt-10">
                                            <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center mb-4 shadow-lg transition-transform duration-300 group-hover:scale-110 group-hover:rotate-3 bg-gradient-to-br", provider.gradient)}>
                                                <Icon className="h-7 w-7 text-white" />
                                            </div>
                                            <h3 className="text-lg font-black tracking-tight mb-1">{provider.name}</h3>
                                            <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2 mb-4">{provider.description}</p>
                                            <div className="flex items-center justify-between">
                                                <Badge variant={connected ? "default" : "secondary"}
                                                    className={cn("text-[9px] font-black uppercase tracking-widest rounded-full px-3",
                                                        connected ? "bg-emerald-500/10 text-emerald-600 border-emerald-200" : "")}>
                                                    {connected ? "Connected" : provider.category}
                                                </Badge>
                                                <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    {connected ? "Manage" : "Connect"} <ArrowRight className="h-3 w-3" />
                                                </span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {/* App Detail Modal */}
            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="max-w-md rounded-3xl border-none shadow-2xl p-0 overflow-hidden">
                    {selectedProvider && (() => {
                        const connected = isConnected(selectedProvider.id);
                        const Icon = selectedProvider.icon;
                        return (
                            <>
                                {/* Hero */}
                                <div className={cn("p-8 bg-gradient-to-br", selectedProvider.gradient)}>
                                    <div className="flex items-center gap-4">
                                        <div className="h-16 w-16 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center shadow-xl">
                                            <Icon className="h-8 w-8 text-white" />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-black text-white">{selectedProvider.name}</h2>
                                            <p className="text-white/70 text-xs font-bold uppercase tracking-widest">{selectedProvider.category}</p>
                                        </div>
                                    </div>
                                </div>
                                <div className="p-6 space-y-6">
                                    <p className="text-sm text-muted-foreground leading-relaxed">{selectedProvider.description}</p>
                                    
                                    {/* Status */}
                                    <div className="flex items-center gap-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50">
                                        <div className={cn("h-3 w-3 rounded-full", connected ? "bg-emerald-500" : "bg-slate-400")} />
                                        <span className="text-sm font-black uppercase tracking-widest">
                                            {connected ? "Connected & Active" : "Not Connected"}
                                        </span>
                                        {connected && getRecord(selectedProvider.id)?.updatedAt && (
                                            <span className="text-[10px] text-muted-foreground ml-auto">
                                                Since {new Date(getRecord(selectedProvider.id)!.updatedAt).toLocaleDateString()}
                                            </span>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-3">
                                        {connected ? (
                                            <>
                                                {selectedProvider.canSync && (
                                                    <Button onClick={() => handleSync(selectedProvider)} variant="outline" className="flex-1 rounded-2xl font-black uppercase tracking-widest" disabled={isSyncing === selectedProvider.id}>
                                                        <RefreshCw className={cn("h-4 w-4 mr-2", isSyncing === selectedProvider.id && "animate-spin")} />
                                                        {isSyncing === selectedProvider.id ? "Syncing..." : "Sync Now"}
                                                    </Button>
                                                )}
                                                <Button onClick={() => handleDisconnect(selectedProvider)} variant="destructive" className="flex-1 rounded-2xl font-black uppercase tracking-widest">
                                                    <Trash2 className="h-4 w-4 mr-2" />Disconnect
                                                </Button>
                                            </>
                                        ) : (
                                            <Button onClick={() => handleConnect(selectedProvider)} className="flex-1 rounded-2xl font-black uppercase tracking-widest bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500">
                                                <Link2 className="h-4 w-4 mr-2" />Connect {selectedProvider.name}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </>
                        );
                    })()}
                </DialogContent>
            </Dialog>

            {/* Manual Config Modal */}
            <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
                <DialogContent className="max-w-sm rounded-3xl">
                    <DialogHeader>
                        <DialogTitle className="font-black uppercase tracking-tight">
                            Connect {selectedProvider?.name}
                        </DialogTitle>
                        <DialogDescription>Enter your credentials to complete the connection.</DialogDescription>
                    </DialogHeader>

                    {selectedProvider?.id === "figma" && (
                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest">Figma File URL</Label>
                            <Input placeholder="https://www.figma.com/file/..." value={manualInputs.figmaUrl || ""} onChange={e => setManualInputs({ figmaUrl: e.target.value })} className="rounded-xl" />
                        </div>
                    )}
                    {selectedProvider?.id === "canva" && (
                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest">Canva Share URL</Label>
                            <Input placeholder="https://www.canva.com/design/..." value={manualInputs.canvaUrl || ""} onChange={e => setManualInputs({ canvaUrl: e.target.value })} className="rounded-xl" />
                        </div>
                    )}
                    {selectedProvider?.id === "trello" && (
                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest">Trello API Key</Label>
                            <Input placeholder="Your Trello API key..." value={manualInputs.apiKey || ""} onChange={e => setManualInputs({ ...manualInputs, apiKey: e.target.value })} className="rounded-xl" />
                            <Label className="text-xs font-black uppercase tracking-widest">Access Token</Label>
                            <Input placeholder="Your Trello token..." value={manualInputs.token || ""} onChange={e => setManualInputs({ ...manualInputs, token: e.target.value })} className="rounded-xl" />
                        </div>
                    )}
                    {selectedProvider?.id === "woocommerce" && (
                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest">Store URL</Label>
                            <Input placeholder="https://mystore.com" value={manualInputs.storeUrl || ""} onChange={e => setManualInputs({ ...manualInputs, storeUrl: e.target.value })} className="rounded-xl" />
                            <Label className="text-xs font-black uppercase tracking-widest">Consumer Key</Label>
                            <Input placeholder="ck_..." value={manualInputs.consumerKey || ""} onChange={e => setManualInputs({ ...manualInputs, consumerKey: e.target.value })} className="rounded-xl" />
                            <Label className="text-xs font-black uppercase tracking-widest">Consumer Secret</Label>
                            <Input placeholder="cs_..." type="password" value={manualInputs.consumerSecret || ""} onChange={e => setManualInputs({ ...manualInputs, consumerSecret: e.target.value })} className="rounded-xl" />
                        </div>
                    )}
                    {selectedProvider?.id === "slack" && (
                        <div className="space-y-3">
                            <Label className="text-xs font-black uppercase tracking-widest">Webhook URL</Label>
                            <Input placeholder="https://hooks.slack.com/services/..." value={manualInputs.webhookUrl || ""} onChange={e => setManualInputs({ webhookUrl: e.target.value })} className="rounded-xl" />
                        </div>
                    )}

                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsManualOpen(false)} className="rounded-xl font-black uppercase tracking-widest">Cancel</Button>
                        <Button onClick={handleManualSubmit} className="rounded-xl font-black uppercase tracking-widest bg-indigo-600 hover:bg-indigo-700">
                            <CheckCircle2 className="h-4 w-4 mr-2" />Connect
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
