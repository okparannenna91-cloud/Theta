"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { RefreshCw, Trash2, CheckCircle2, Plus, Link2, Search, Zap, ArrowRight, Terminal, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
    const [syncedItems, setSyncedItems] = useState<any[]>([]);
    const [isItemsLoading, setIsItemsLoading] = useState(false);
    const [importProjects, setImportProjects] = useState<any[]>([]);
    const [importProjectId, setImportProjectId] = useState<string>("");
    const [isImporting, setIsImporting] = useState<string | null>(null);
    const [linkTarget, setLinkTarget] = useState<any>(null);
    const [repoProjectId, setRepoProjectId] = useState<string>("");
    const [repoCreateNew, setRepoCreateNew] = useState(false);
    const [newRepoProjectName, setNewRepoProjectName] = useState("");
    const [isLinking, setIsLinking] = useState(false);

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

    useEffect(() => {
        if (typeof window === "undefined") return;
        const params = new URLSearchParams(window.location.search);
        const status = params.get("status");
        const provider = params.get("provider");
        if (!status) return;

        const name = PROVIDERS.find(p => p.id === provider)?.name || provider || "App";
        const cleanUrl = () => {
            const url = new URL(window.location.href);
            url.searchParams.delete("status");
            url.searchParams.delete("provider");
            window.history.replaceState({}, "", `${url.pathname}${url.search}`);
        };

        fetchIntegrations();
        if (window.opener) {
            window.opener.postMessage({ source: "theta-apps", status, provider }, "*");
            cleanUrl();
            window.close();
        } else {
            if (status === "success") toast.success(`${name} connected!`);
            else toast.error(`Failed to connect ${name}.`);
            cleanUrl();
        }
    }, [fetchIntegrations]);

    useEffect(() => {
        const onMessage = (e: MessageEvent) => {
            if (e.data?.source !== "theta-apps") return;
            const name = PROVIDERS.find(p => p.id === e.data.provider)?.name || e.data.provider || "App";
            if (e.data.status === "success") toast.success(`${name} connected!`);
            else toast.error(`Failed to connect ${name}.`);
            fetchIntegrations();
        };
        window.addEventListener("message", onMessage);
        return () => window.removeEventListener("message", onMessage);
    }, [fetchIntegrations]);

    const isConnected = (id: string) => integrations.some(i => i.provider === id);
    const getRecord = (id: string) => integrations.find(i => i.provider === id);

    const filteredProviders = useMemo(() => {
        return PROVIDERS.filter(p => {
            const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                p.description.toLowerCase().includes(searchQuery.toLowerCase());
            const matchCat = activeCategory === "All" || p.category === activeCategory;
            const connected = integrations.some(i => i.provider === p.id);
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
            const payload: Record<string, any> = { workspaceId: activeWorkspaceId };
            if (selectedProvider.id === "figma") payload.config_url = manualInputs.figmaUrl;
            else if (selectedProvider.id === "canva") payload.config_url = manualInputs.canvaUrl;
            else if (selectedProvider.id === "slack") payload.webhookUrl = manualInputs.webhookUrl;
            else if (selectedProvider.id === "trello") { payload.apiKey = manualInputs.apiKey; payload.token = manualInputs.token; }
            else if (selectedProvider.id === "woocommerce") { payload.siteUrl = manualInputs.siteUrl; payload.consumerKey = manualInputs.consumerKey; payload.consumerSecret = manualInputs.consumerSecret; }
            else Object.assign(payload, manualInputs);

            const res = await fetch(`/api/integrations/${selectedProvider.id}/connect`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            if (res.ok) { toast.success(`${selectedProvider.name} connected!`); setIsManualOpen(false); fetchIntegrations(); }
            else { const d = await res.json(); toast.error(d.error || "Failed to connect."); }
        } catch { toast.error("Connection failed. Try again."); }
    };

    const handleDisconnect = async (provider: any) => {
        const record = getRecord(provider.id);
        if (!record || !activeWorkspaceId) return;
        try {
            const res = await fetch(`/api/integrations?id=${record.id}&workspaceId=${activeWorkspaceId}`, { method: "DELETE" });
            if (res.ok) {
                toast.success(`${provider.name} disconnected.`);
                fetchIntegrations(); setIsDetailOpen(false);
            } else {
                const d = await res.json().catch(() => ({}));
                toast.error(d.error || `Failed to disconnect ${provider.name}.`);
            }
        } catch { toast.error("Failed to disconnect."); }
    };

    const handleSync = async (provider: any) => {
        if (!activeWorkspaceId) return;
        setIsSyncing(provider.id);
        try {
            const res = await fetch(`/api/integrations/sync?workspaceId=${activeWorkspaceId}&provider=${provider.id}`, { method: "POST" });
            if (res.ok) { toast.success(`${provider.name} synced!`); loadSyncedItems(provider.id); }
            else { const d = await res.json().catch(() => ({})); toast.error(d.error || "Sync failed."); }
        } catch { toast.error("Sync error."); }
        finally { setIsSyncing(null); }
    };

    const loadSyncedItems = useCallback(async (providerId: string) => {
        if (!activeWorkspaceId) return;
        setIsItemsLoading(true);
        try {
            const res = await fetch(`/api/integrations/sync/items?workspaceId=${activeWorkspaceId}&provider=${providerId}`);
            const data = await res.json();
            setSyncedItems(Array.isArray(data.items) ? data.items : []);
        } catch { setSyncedItems([]); }
        finally { setIsItemsLoading(false); }
    }, [activeWorkspaceId]);

    const loadImportProjects = useCallback(async () => {
        if (!activeWorkspaceId) return;
        try {
            const res = await fetch(`/api/projects?workspaceId=${activeWorkspaceId}`);
            const data = await res.json();
            const projects = Array.isArray(data.projects) ? data.projects : [];
            setImportProjects(projects);
            if (projects.length > 0) setImportProjectId(prev => prev || projects[0].id);
            if (projects.length > 0) setRepoProjectId(prev => prev || projects[0].id);
        } catch { setImportProjects([]); }
    }, [activeWorkspaceId]);

    // Container external id -> linked project id (from synced container items)
    const containerProjectMap = useMemo(() => {
        const m: Record<string, string> = {};
        for (const it of syncedItems) {
            if (it.extra?.linkedProjectId) m[it.externalId] = it.extra.linkedProjectId;
        }
        return m;
    }, [syncedItems]);

    const projectNameMap = useMemo(() => {
        const m: Record<string, string> = {};
        for (const p of importProjects) m[p.id] = p.name;
        return m;
    }, [importProjects]);

    const isContainerType = (t: string) => ["repo", "board", "project"].includes(t);
    const isWorkItemType = (t: string) => ["issue", "card", "task"].includes(t);

    const openDetail = (provider: any) => {
        setSelectedProvider(provider);
        setIsDetailOpen(true);
        setSyncedItems([]);
        setImportProjectId("");
        setRepoProjectId("");
        if (isConnected(provider.id) && provider.canSync) {
            loadSyncedItems(provider.id);
            loadImportProjects();
        }
    };

    const handleImport = async (item: any) => {
        // Items whose parent container is linked import into that project automatically.
        let targetProjectId = importProjectId;
        if (item.extra?.parentId && containerProjectMap[item.extra.parentId]) {
            targetProjectId = containerProjectMap[item.extra.parentId];
        }
        if (!targetProjectId) { toast.error("Select a project to import into."); return; }
        setIsImporting(item.id);
        try {
            const res = await fetch(`/api/integrations/sync/import`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemId: item.id, projectId: targetProjectId })
            });
            if (res.ok) {
                const d = await res.json();
                if (d.alreadyImported) toast.info("Already imported into a task.");
                else toast.success("Imported as a task!");
                loadSyncedItems(selectedProvider?.id);
            } else {
                const d = await res.json().catch(() => ({}));
                toast.error(d.error || "Import failed.");
            }
        } catch { toast.error("Import error."); }
        finally { setIsImporting(null); }
    };

    const openLinkDialog = (item: any) => {
        setLinkTarget(item);
        setRepoProjectId(importProjects[0]?.id || "");
        setRepoCreateNew(false);
        setNewRepoProjectName("");
    };

    const handleLinkRepo = async () => {
        if (!linkTarget) return;
        const projectId = repoCreateNew ? "" : repoProjectId;
        const newProjectName = repoCreateNew ? (newRepoProjectName.trim() || linkTarget.title) : "";
        if (!repoCreateNew && !projectId) { toast.error("Select a project."); return; }
        setIsLinking(true);
        try {
            const res = await fetch(`/api/integrations/sync/link`, {
                method: "POST", headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ itemId: linkTarget.id, projectId, newProjectName })
            });
            if (res.ok) {
                const d = await res.json();
                toast.success(d.importedCount > 0
                    ? `Linked to "${d.project.name}" · ${d.importedCount} issue(s) imported.`
                    : `Linked to "${d.project.name}".`);
                setLinkTarget(null);
                setRepoCreateNew(false);
                setNewRepoProjectName("");
                loadSyncedItems(selectedProvider?.id);
                loadImportProjects();
            } else {
                const d = await res.json().catch(() => ({}));
                toast.error(d.error || "Link failed.");
            }
        } catch { toast.error("Link error."); }
        finally { setIsLinking(false); }
    };

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
                                {connected && (selectedProvider.id === "figma" || selectedProvider.id === "canva") && (() => {
                                    const rec = getRecord(selectedProvider.id);
                                    const url = rec?.config?.url as string | undefined;
                                    if (!url) return null;
                                    const isFigma = selectedProvider.id === "figma";
                                    const embedUrl = isFigma
                                        ? `https://www.figma.com/embed?embed_host=astra&url=${encodeURIComponent(url)}`
                                        : null;
                                    return (
                                        <div className="border rounded-lg p-3 space-y-3">
                                            <p className="text-xs font-medium text-foreground uppercase tracking-wide">Linked File</p>
                                            <a href={url} target="_blank" rel="noreferrer" className="text-xs text-primary underline break-all block">{url}</a>
                                            {isFigma ? (
                                                <div className="aspect-[16/10] w-full overflow-hidden rounded border bg-muted">
                                                    <iframe src={embedUrl!} className="w-full h-full" allowFullScreen loading="lazy" title={`${selectedProvider.name} embed`} referrerPolicy="strict-origin-when-cross-origin" />
                                                </div>
                                            ) : (
                                                <div className="flex items-center gap-3 p-3 rounded border bg-muted/30">
                                                    <div className="w-10 h-10 rounded bg-[#00C4CC] flex items-center justify-center text-white text-xs font-bold shrink-0">C</div>
                                                    <div className="min-w-0 flex-1">
                                                        <p className="text-xs font-medium truncate">Canva Design</p>
                                                        <p className="text-[11px] text-muted-foreground">Opens in Canva — embedding is blocked by Canva</p>
                                                    </div>
                                                </div>
                                            )}
                                            <p className="text-[11px] text-muted-foreground">If the preview is blocked, open directly in {selectedProvider.name}.</p>
                                            <Button variant="outline" size="sm" className="w-full h-8 text-xs" onClick={() => window.open(url, "_blank")}>
                                                Open in {selectedProvider.name} <ArrowRight className="h-3 w-3 ml-1" />
                                            </Button>
                                        </div>
                                    );
                                })()}
                                {connected && selectedProvider.canSync && (
                                    <div className="border rounded-lg p-3 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <p className="text-xs font-medium text-foreground uppercase tracking-wide">
                                                Synced Items {syncedItems.length > 0 && `(${syncedItems.length})`}
                                            </p>
                                            <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={() => loadSyncedItems(selectedProvider.id)} disabled={isItemsLoading}>
                                                <RefreshCw className={cn("h-3 w-3 mr-1", isItemsLoading && "animate-spin")} />Refresh
                                            </Button>
                                        </div>
                                        {isItemsLoading ? (
                                            <div className="space-y-2">
                                                <Skeleton className="h-8 w-full" />
                                                <Skeleton className="h-8 w-full" />
                                                <Skeleton className="h-8 w-full" />
                                            </div>
                                        ) : syncedItems.length === 0 ? (
                                            <p className="text-xs text-muted-foreground text-center py-3">
                                                Nothing synced yet. Click Sync to fetch items from {selectedProvider.name}.
                                            </p>
                                        ) : (
                                            <>
                                                <div className="max-h-48 overflow-y-auto space-y-2">
                                                    {syncedItems.map(item => (
                                                        <div key={item.id} className="flex items-start gap-2 rounded-md border bg-muted/20 p-2">
                                                            <div className="flex-1 min-w-0">
                                                                <p className="text-xs font-medium text-foreground truncate">{item.title}</p>
                                                                <p className="text-[10px] text-muted-foreground capitalize">
                                                                    {item.type}{item.status ? ` · ${item.status}` : ""}
                                                                    {isContainerType(item.type) && item.extra?.linkedProjectId
                                                                        ? ` · Linked to ${projectNameMap[item.extra.linkedProjectId] || "project"}`
                                                                        : item.imported ? " · Imported" : ""}
                                                                </p>
                                                            </div>
                                                            {isContainerType(item.type) ? (
                                                                <Button
                                                                    variant="outline" size="sm" className="h-6 px-2 text-xs shrink-0"
                                                                    onClick={() => openLinkDialog(item)}
                                                                >
                                                                    <Link2 className="h-3 w-3 mr-1" />
                                                                    {item.extra?.linkedProjectId ? "Relink" : "Link to Project"}
                                                                </Button>
                                                            ) : !isWorkItemType(item.type) ? (
                                                                <Badge variant="outline" className="h-6 px-2 text-[10px] shrink-0 text-muted-foreground">
                                                                    Catalog
                                                                </Badge>
                                                            ) : (
                                                                <Button
                                                                    variant="outline" size="sm" className="h-6 px-2 text-xs shrink-0"
                                                                    onClick={() => handleImport(item)}
                                                                    disabled={isImporting === item.id}
                                                                >
                                                                    <Download className="h-3 w-3 mr-1" />
                                                                    {isImporting === item.id ? "..." : "Import"}
                                                                </Button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                                {importProjects.length > 0 && (
                                                    <div className="space-y-1.5">
                                                        <Label className="text-xs">Import into project</Label>
                                                        <Select value={importProjectId} onValueChange={setImportProjectId}>
                                                            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Select project" /></SelectTrigger>
                                                            <SelectContent>
                                                                {importProjects.map(p => (
                                                                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                                                ))}
                                                            </SelectContent>
                                                        </Select>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}
                            </>
                        );
                    })()}
                </DialogContent>
            </Dialog>

            <Dialog open={!!linkTarget} onOpenChange={(open) => { if (!open) setLinkTarget(null); }}>
                <DialogContent className="sm:max-w-sm">
                    {linkTarget && (
                        <>
                            <DialogHeader>
                                <DialogTitle className="flex items-center gap-2">
                                    <Link2 className="h-4 w-4" />Link to Project
                                </DialogTitle>
                                <DialogDescription className="truncate capitalize">
                                    {linkTarget.type} · {linkTarget.title}
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div className="space-y-1.5">
                                    <Label className="text-xs">Target project</Label>
                                    <Select
                                        value={repoCreateNew ? "__new__" : repoProjectId}
                                        onValueChange={(v) => {
                                            if (v === "__new__") { setRepoCreateNew(true); }
                                            else { setRepoCreateNew(false); setRepoProjectId(v); }
                                        }}
                                    >
                                        <SelectTrigger className="text-xs"><SelectValue placeholder="Choose a project" /></SelectTrigger>
                                        <SelectContent>
                                            {importProjects.map(p => (
                                                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                                            ))}
                                            <SelectItem value="__new__">+ Create new project</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                {repoCreateNew && (
                                    <div className="space-y-1.5">
                                        <Label className="text-xs">New project name</Label>
                                        <Input
                                            placeholder={linkTarget.title}
                                            value={newRepoProjectName}
                                            onChange={e => setNewRepoProjectName(e.target.value)}
                                        />
                                    </div>
                                )}
                                <p className="text-[11px] text-muted-foreground">
                                    Linking imports this {linkTarget.type}&apos;s open items as tasks into the project.
                                    The {linkTarget.type} itself never becomes a task.
                                </p>
                            </div>
                            <DialogFooter className="gap-2">
                                <Button variant="outline" onClick={() => setLinkTarget(null)}>Cancel</Button>
                                <Button onClick={handleLinkRepo} disabled={isLinking || (!repoCreateNew && !repoProjectId)}>
                                    <Link2 className="h-4 w-4 mr-2" />
                                    {isLinking ? "Linking..." : "Link & Import"}
                                </Button>
                            </DialogFooter>
                        </>
                    )}
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
                            <Input placeholder="https://mystore.com" value={manualInputs.siteUrl || ""} onChange={e => setManualInputs({ ...manualInputs, siteUrl: e.target.value })} />
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

            {/* GitHub/Slack Webhooks Info */}
            <div className="mt-6">
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                        <Terminal className="h-4 w-4 text-emerald-500" />
                    </div>
                    <div>
                        <h2 className="text-base font-semibold">Webhooks</h2>
                        <p className="text-xs text-muted-foreground">Receive real-time events from connected services</p>
                    </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <Card className="border shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-zinc-900 flex items-center justify-center">
                                    <span className="text-white text-xs font-bold">GH</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">GitHub Webhooks</p>
                                    <p className="text-xs text-muted-foreground">Issues, PRs, pushes</p>
                                </div>
                                <Badge variant="outline" className="text-xs">Auto-synced</Badge>
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="border shadow-sm">
                        <CardContent className="p-4">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-white border flex items-center justify-center">
                                    <span className="text-xs font-bold text-purple-700">S</span>
                                </div>
                                <div className="flex-1">
                                    <p className="text-sm font-medium">Slack Commands</p>
                                    <p className="text-xs text-muted-foreground">/theta create, /theta status</p>
                                </div>
                                <Badge variant="outline" className="text-xs">Auto-synced</Badge>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    );
}
