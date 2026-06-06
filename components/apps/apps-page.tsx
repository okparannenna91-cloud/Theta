"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { RefreshCw, Trash2, CheckCircle2, Plus, Link2, Search, Zap, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { useWorkspace } from "@/hooks/use-workspace";
import { usePopups } from "@/components/popups/popup-manager";
import { cn } from "@/lib/utils";
import {
    GitHubLogo, BitbucketLogo, SlackLogo, AsanaLogo,
    TrelloLogo, FigmaLogo, CanvaLogo, WooCommerceLogo
} from "@/components/apps/app-logos";

const CATEGORIES = ["All", "Communication", "Development", "Design", "Productivity", "E-commerce"];

const PROVIDERS = [
    {
        id: "github", name: "GitHub", category: "Development",
        description: "Sync repositories, fetch commits, and automate task tracking directly from your codebase.",
        Logo: GitHubLogo, bg: "bg-zinc-900", iconColor: "text-white",
        canSync: true, badge: "Popular",
    },
    {
        id: "bitbucket", name: "Bitbucket", category: "Development",
        description: "Sync repositories and pull request data for complete dev workflow automation.",
        Logo: BitbucketLogo, bg: "bg-[#0052CC]", iconColor: "text-white",
        canSync: true, badge: null,
    },
    {
        id: "slack", name: "Slack", category: "Communication",
        description: "Send real-time notifications, task updates, and alerts directly to your Slack workspace.",
        Logo: SlackLogo, bg: "bg-white", iconColor: "",
        canSync: false, linkOnly: true, badge: "Popular",
    },
    {
        id: "asana", name: "Asana", category: "Productivity",
        description: "Import projects and keep tasks in sync across platforms seamlessly.",
        Logo: AsanaLogo, bg: "bg-[#ffe3de]", iconColor: "",
        canSync: true, badge: null,
    },
    {
        id: "trello", name: "Trello", category: "Productivity",
        description: "Convert Trello cards to tasks and sync board statuses automatically.",
        Logo: TrelloLogo, bg: "bg-[#0079BF]", iconColor: "text-white",
        canSync: true, badge: null,
    },
    {
        id: "figma", name: "Figma", category: "Design",
        description: "Embed live Figma files directly into your project views for seamless design handoff.",
        Logo: FigmaLogo, bg: "bg-black", iconColor: "",
        canSync: false, linkOnly: true, badge: "New",
    },
    {
        id: "canva", name: "Canva", category: "Design",
        description: "Access and share your Canva designs directly within your project workspace.",
        Logo: CanvaLogo, bg: "bg-[#00C4CC]", iconColor: "text-white",
        canSync: false, linkOnly: true, badge: null,
    },
    {
        id: "woocommerce", name: "WooCommerce", category: "E-commerce",
        description: "Fetch products and sync webshop orders to your project dashboard in real-time.",
        Logo: WooCommerceLogo, bg: "bg-[#96588A]", iconColor: "text-white",
        canSync: true, badge: null,
    },
];

interface IntegrationRecord {
    id: string; provider: string; updatedAt: string; config: any;
}

export default function AppsPage() {
    const { activeWorkspaceId } = useWorkspace();
    const { showUpgradePrompt } = usePopups();
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
            const connected = isConnected(p.id);
            const matchStatus = statusFilter === "all" ? true
                : statusFilter === "connected" ? connected : !connected;
            return matchSearch && matchCat && matchStatus;
        });
    }, [searchQuery, activeCategory, statusFilter, integrations]);

    const connectedApps = PROVIDERS.filter(p => isConnected(p.id));

    const handleConnect = (provider: any) => {
        if (!activeWorkspaceId) return;
        if (!limits.hasAccess || (limits.max !== -1 && limits.current >= limits.max)) {
            showUpgradePrompt("integrations");
            return;
        }
        if (provider.linkOnly || ["trello","woocommerce","slack"].includes(provider.id)) {
            setSelectedProvider(provider);
            setManualInputs({});
            setIsManualOpen(true);
            setIsDetailOpen(false);
            return;
        }
        window.open(`/api/integrations/${provider.id}/connect?workspaceId=${activeWorkspaceId}`, "_blank", "width=600,height=700");
        toast.info(`Connecting to ${provider.name}...`);
    };

    const handleManualSubmit = async () => {
        if (!activeWorkspaceId || !selectedProvider) return;
        if (!limits.hasAccess || (limits.max !== -1 && limits.current >= limits.max)) {
            showUpgradePrompt("integrations");
            return;
        }
        try {
            const res = await fetch(`/api/integrations/${selectedProvider.id}/connect`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ workspaceId: activeWorkspaceId, ...manualInputs })
            });
            if (res.ok) { toast.success(`${selectedProvider.name} connected!`); setIsManualOpen(false); fetchIntegrations(); }
            else { const d = await res.json(); toast.error(d.error || "Failed to connect."); }
        } catch { toast.error("Connection failed. Try again."); }
    };

    const handleDisconnect = async (provider: any) => {
        const record = getRecord(provider.id);
        if (!record || !activeWorkspaceId) return;
        try {
            await fetch(`/api/integrations?id=${record.id}&workspaceId=${activeWorkspaceId}`, { method: "DELETE" });
            toast.success(`${provider.name} disconnected.`);
            fetchIntegrations(); setIsDetailOpen(false);
        } catch { toast.error("Failed to disconnect."); }
    };

    const handleSync = async (provider: any) => {
        if (!activeWorkspaceId) return;
        setIsSyncing(provider.id);
        try {
            const res = await fetch(`/api/integrations/sync?workspaceId=${activeWorkspaceId}&provider=${provider.id}`, { method: "POST" });
            if (res.ok) toast.success(`${provider.name} synced!`); else toast.error("Sync failed.");
        } catch { toast.error("Sync error."); }
        finally { setIsSyncing(null); }
    };

    const openDetail = (provider: any) => { setSelectedProvider(provider); setIsDetailOpen(true); };

    return (
        <div className="pb-10">
            <div className="mb-8">
                <h1 className="text-2xl font-semibold text-foreground">Apps & Integrations</h1>
                <p className="text-sm text-muted-foreground mt-1">
                    Connect your tools to supercharge your workflow
                </p>
            </div>

            {connectedApps.length > 0 && (
                <div className="mb-6 p-4 rounded-lg border bg-muted/30">
                    <p className="text-xs font-medium text-foreground mb-3 flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-500" />
                        {connectedApps.length} Connected
                    </p>
                    <div className="flex items-center gap-2 flex-wrap">
                        {connectedApps.map(p => {
                            const L = p.Logo;
                            return (
                                <button key={p.id} onClick={() => openDetail(p)}
                                    className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-background hover:border-primary/30 transition-colors text-xs">
                                    <L size={16} />
                                    <span className="font-medium">{p.name}</span>
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 mb-6">
                <div className="relative flex-1 max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input placeholder="Search apps..." className="pl-9 h-10"
                        value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    {(["all","connected","not_connected"] as const).map(s => (
                        <button key={s} onClick={() => setStatusFilter(s)}
                            className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                                statusFilter === s ? "bg-primary text-primary-foreground" : "border bg-background text-muted-foreground hover:border-primary/30")}>
                            {s === "not_connected" ? "Not Connected" : s === "connected" ? "Connected" : "All Apps"}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex gap-2 flex-wrap mb-6">
                {CATEGORIES.map(cat => (
                    <button key={cat} onClick={() => setActiveCategory(cat)}
                        className={cn("px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                            activeCategory === cat ? "bg-primary text-primary-foreground" : "border bg-background text-muted-foreground hover:border-primary/30")}>
                        {cat}
                    </button>
                ))}
            </div>

            {isLoading ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {[1,2,3,4,5,6,7,8].map(i => <Skeleton key={i} className="h-48 rounded-lg" />)}
                </div>
            ) : filteredProviders.length === 0 ? (
                <div className="text-center py-16 border rounded-lg">
                    <Zap className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">No apps found. Try adjusting your search or filters.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {filteredProviders.map((provider) => {
                        const connected = isConnected(provider.id);
                        const Logo = provider.Logo;
                        return (
                            <Card key={provider.id}
                                onClick={() => openDetail(provider)}
                                className="border shadow-sm hover:border-primary/30 transition-colors cursor-pointer">
                                <CardContent className="p-4">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", provider.bg)}>
                                            <Logo size={20} className={provider.iconColor} />
                                        </div>
                                        {provider.badge && (
                                            <Badge variant="secondary" className="text-xs rounded-md px-2 h-5">
                                                {provider.badge}
                                            </Badge>
                                        )}
                                    </div>
                                    <h3 className="text-sm font-medium text-foreground mb-1">{provider.name}</h3>
                                    <p className="text-xs text-muted-foreground line-clamp-2 mb-3">{provider.description}</p>
                                    <div className="flex items-center justify-between">
                                        <Badge variant={connected ? "default" : "outline"} className="text-xs rounded-md px-2 h-5">
                                            {connected ? "Connected" : provider.category}
                                        </Badge>
                                        <span className="text-xs text-primary flex items-center gap-1">
                                            {connected ? "Manage" : "Connect"} <ArrowRight className="h-3 w-3" />
                                        </span>
                                    </div>
                                </CardContent>
                            </Card>
                        );
                    })}
                </div>
            )}

            <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
                <DialogContent className="sm:max-w-md">
                    {selectedProvider && (() => {
                        const connected = isConnected(selectedProvider.id);
                        const Logo = selectedProvider.Logo;
                        return (
                            <>
                                <DialogHeader>
                                    <DialogTitle className="flex items-center gap-3">
                                        <div className={cn("w-10 h-10 rounded-lg flex items-center justify-center", selectedProvider.bg)}>
                                            <Logo size={20} className={selectedProvider.iconColor} />
                                        </div>
                                        {selectedProvider.name}
                                    </DialogTitle>
                                </DialogHeader>
                                <p className="text-sm text-muted-foreground">{selectedProvider.description}</p>
                                <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
                                    <div className={cn("h-2 w-2 rounded-full", connected ? "bg-emerald-500" : "bg-muted-foreground")} />
                                    <span className="text-sm font-medium">
                                        {connected ? "Connected" : "Not Connected"}
                                    </span>
                                </div>
                                <div className="flex gap-3">
                                    {connected ? (
                                        <>
                                            {selectedProvider.canSync && (
                                                <Button onClick={() => handleSync(selectedProvider)} variant="outline" className="flex-1" disabled={isSyncing === selectedProvider.id}>
                                                    <RefreshCw className={cn("h-4 w-4 mr-2", isSyncing === selectedProvider.id && "animate-spin")} />
                                                    {isSyncing === selectedProvider.id ? "Syncing..." : "Sync"}
                                                </Button>
                                            )}
                                            <Button onClick={() => handleDisconnect(selectedProvider)} variant="destructive" className="flex-1">
                                                <Trash2 className="h-4 w-4 mr-2" />Disconnect
                                            </Button>
                                        </>
                                    ) : (
                                        <Button onClick={() => handleConnect(selectedProvider)} className="flex-1">
                                            <Link2 className="h-4 w-4 mr-2" />Connect
                                        </Button>
                                    )}
                                </div>
                            </>
                        );
                    })()}
                </DialogContent>
            </Dialog>

            <Dialog open={isManualOpen} onOpenChange={setIsManualOpen}>
                <DialogContent className="sm:max-w-sm">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            {selectedProvider && <selectedProvider.Logo size={18} />}
                            Connect {selectedProvider?.name}
                        </DialogTitle>
                        <DialogDescription>Enter your credentials to complete the connection.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        {selectedProvider?.id === "figma" && <>
                            <Label>Figma File URL</Label>
                            <Input placeholder="https://www.figma.com/file/..." value={manualInputs.figmaUrl || ""} onChange={e => setManualInputs({ figmaUrl: e.target.value })} />
                        </>}
                        {selectedProvider?.id === "canva" && <>
                            <Label>Canva Share URL</Label>
                            <Input placeholder="https://www.canva.com/design/..." value={manualInputs.canvaUrl || ""} onChange={e => setManualInputs({ canvaUrl: e.target.value })} />
                        </>}
                        {selectedProvider?.id === "slack" && <>
                            <Label>Slack Webhook URL</Label>
                            <Input placeholder="https://hooks.slack.com/services/..." value={manualInputs.webhookUrl || ""} onChange={e => setManualInputs({ webhookUrl: e.target.value })} />
                        </>}
                        {selectedProvider?.id === "trello" && <>
                            <Label>Trello API Key</Label>
                            <Input placeholder="Your API key..." value={manualInputs.apiKey || ""} onChange={e => setManualInputs({ ...manualInputs, apiKey: e.target.value })} />
                            <Label>Access Token</Label>
                            <Input placeholder="Your token..." value={manualInputs.token || ""} onChange={e => setManualInputs({ ...manualInputs, token: e.target.value })} />
                        </>}
                        {selectedProvider?.id === "woocommerce" && <>
                            <Label>Store URL</Label>
                            <Input placeholder="https://mystore.com" value={manualInputs.storeUrl || ""} onChange={e => setManualInputs({ ...manualInputs, storeUrl: e.target.value })} />
                            <Label>Consumer Key</Label>
                            <Input placeholder="ck_..." value={manualInputs.consumerKey || ""} onChange={e => setManualInputs({ ...manualInputs, consumerKey: e.target.value })} />
                            <Label>Consumer Secret</Label>
                            <Input placeholder="cs_..." type="password" value={manualInputs.consumerSecret || ""} onChange={e => setManualInputs({ ...manualInputs, consumerSecret: e.target.value })} />
                        </>}
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setIsManualOpen(false)}>Cancel</Button>
                        <Button onClick={handleManualSubmit}>
                            <CheckCircle2 className="h-4 w-4 mr-2" />Connect
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
