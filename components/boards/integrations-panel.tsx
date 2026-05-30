"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import {
  Puzzle, Plug, PlugZap, ExternalLink, Trash2, RefreshCcw,
  CheckCircle2, XCircle, AlertCircle, Settings, Loader2,
  Webhook, Key, Globe, Bell, Server, Code
} from "lucide-react";

interface IntegrationsPanelProps {
  workspaceId: string;
  boardId: string;
}

interface Integration {
  id: string;
  provider: string;
  type: string;
  config: Record<string, any>;
  connected: boolean;
  createdAt: string;
}

const PROVIDERS = [
  { id: "slack", label: "Slack", icon: Bell, color: "text-[#4A154B]", bg: "bg-[#4A154B]/10", desc: "Notifications & messages", docs: "https://api.slack.com" },
  { id: "github", label: "GitHub", icon: Code, color: "text-[#24292F]", bg: "bg-[#24292F]/10", desc: "Issue & PR tracking", docs: "https://docs.github.com" },
  { id: "woocommerce", label: "WooCommerce", icon: Globe, color: "text-[#96588A]", bg: "bg-[#96588A]/10", desc: "Order & product sync", docs: "https://woocommerce.com/document" },
  { id: "bitbucket", label: "Bitbucket", icon: Server, color: "text-[#0052CC]", bg: "bg-[#0052CC]/10", desc: "Code & PR management", docs: "https://support.atlassian.com/bitbucket-cloud" },
  { id: "asana", label: "Asana", icon: Puzzle, color: "text-[#F06A6A]", bg: "bg-[#F06A6A]/10", desc: "Task & project sync", docs: "https://developers.asana.com" },
  { id: "trello", label: "Trello", icon: Webhook, color: "text-[#0079BF]", bg: "bg-[#0079BF]/10", desc: "Board & card sync", docs: "https://developer.atlassian.com/cloud/trello" },
  { id: "figma", label: "Figma", icon: ExternalLink, color: "text-[#F24E1E]", bg: "bg-[#F24E1E]/10", desc: "Design file embedding", docs: "https://www.figma.com/developers" },
  { id: "canva", label: "Canva", icon: ExternalLink, color: "text-[#00C4CC]", bg: "bg-[#00C4CC]/10", desc: "Design integration", docs: "https://www.canva.com/developers" },
];

const CONFIG_FIELDS: Record<string, { key: string; label: string; placeholder: string; type: string }[]> = {
  github: [
    { key: "repoOwner", label: "Repo Owner", placeholder: "e.g. my-org", type: "text" },
    { key: "repoName", label: "Repo Name", placeholder: "e.g. my-project", type: "text" },
  ],
  woocommerce: [
    { key: "siteUrl", label: "Site URL", placeholder: "https://my-store.com", type: "url" },
    { key: "consumerKey", label: "Consumer Key", placeholder: "ck_...", type: "password" },
    { key: "consumerSecret", label: "Consumer Secret", placeholder: "cs_...", type: "password" },
  ],
  bitbucket: [
    { key: "workspace", label: "Workspace", placeholder: "e.g. my-team", type: "text" },
    { key: "repoSlug", label: "Repo Slug", placeholder: "e.g. my-repo", type: "text" },
  ],
  asana: [
    { key: "projectGid", label: "Project GID", placeholder: "e.g. 123456789", type: "text" },
  ],
  trello: [
    { key: "boardId", label: "Board ID", placeholder: "e.g. abc123", type: "text" },
  ],
  slack: [
    { key: "channel", label: "Default Channel", placeholder: "#general", type: "text" },
  ],
  figma: [
    { key: "fileUrl", label: "File URL", placeholder: "https://figma.com/file/...", type: "url" },
  ],
  canva: [
    { key: "shareUrl", label: "Share URL", placeholder: "https://canva.com/...", type: "url" },
  ],
};

export default function IntegrationsPanel({ workspaceId, boardId }: IntegrationsPanelProps) {
  const [activeProvider, setActiveProvider] = useState<string | null>(null);
  const [configValues, setConfigValues] = useState<Record<string, string>>({});
  const queryClient = useQueryClient();

  const { data: integrationsData, isLoading } = useQuery({
    queryKey: ["integrations", workspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/integrations?workspaceId=${workspaceId}`);
      if (!res.ok) throw new Error("Failed to fetch integrations");
      return res.json();
    },
    enabled: !!workspaceId,
  });

  const integrations: Integration[] = Array.isArray(integrationsData?.integrations)
    ? integrationsData.integrations
    : [];

  const connectMutation = useMutation({
    mutationFn: async ({ provider, config }: { provider: string; config: Record<string, string> }) => {
      const res = await fetch("/api/integrations/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, provider, config }),
      });
      if (!res.ok) throw new Error("Failed to connect");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      setActiveProvider(null);
      setConfigValues({});
      toast.success("Integration connected");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const disconnectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/integrations?id=${id}&workspaceId=${workspaceId}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to disconnect");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["integrations"] });
      toast.success("Integration disconnected");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const syncMutation = useMutation({
    mutationFn: async (provider: string) => {
      const res = await fetch("/api/integrations/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ workspaceId, provider }),
      });
      if (!res.ok) throw new Error("Failed to sync");
      return res.json();
    },
    onSuccess: () => toast.success("Sync triggered"),
    onError: (err: any) => toast.error(err.message),
  });

  const getConnectedProvider = (providerId: string) =>
    integrations.find((i: Integration) => i.provider === providerId);

  const connectedCount = integrations.filter((i: Integration) => i.connected !== false).length;

  return (
    <div className="flex flex-col h-full">
      <div className="p-6 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Puzzle className="h-5 w-5 text-indigo-500" />
              Integrations
            </h3>
            <p className="text-xs text-muted-foreground">
              {connectedCount} of {PROVIDERS.length} services connected
            </p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-4 space-y-3">
        {PROVIDERS.map((provider) => {
          const Icon = provider.icon;
          const connected = getConnectedProvider(provider.id);
          return (
            <Card key={provider.id} className={cn(
              "border shadow-sm transition-all",
              connected ? "border-emerald-200 dark:border-emerald-900" : ""
            )}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={cn("h-10 w-10 rounded-xl flex items-center justify-center", provider.bg)}>
                      <Icon className={cn("h-5 w-5", provider.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold">{provider.label}</h4>
                        {connected ? (
                          <Badge className="h-5 text-[8px] bg-emerald-500/10 text-emerald-600 border-emerald-200 gap-1">
                            <CheckCircle2 className="h-2.5 w-2.5" /> Connected
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="h-5 text-[8px] text-slate-400 gap-1">
                            <XCircle className="h-2.5 w-2.5" /> Disconnected
                          </Badge>
                        )}
                      </div>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{provider.desc}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    {connected ? (
                      <>
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => syncMutation.mutate(provider.id)}
                          disabled={syncMutation.isPending}
                        >
                          <RefreshCcw className="h-3 w-3 text-slate-400" />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => setActiveProvider(activeProvider === provider.id ? null : provider.id)}
                        >
                          <Settings className={cn("h-3 w-3 text-slate-400", activeProvider === provider.id && "text-indigo-500")} />
                        </Button>
                        <Button
                          variant="ghost" size="sm"
                          className="h-7 w-7 p-0 hover:text-red-500"
                          onClick={() => disconnectMutation.mutate(connected.id)}
                        >
                          <Trash2 className="h-3 w-3 text-slate-400" />
                        </Button>
                      </>
                    ) : (
                      <Button
                        size="sm"
                        className="h-7 text-[10px] font-bold rounded-xl gap-1"
                        onClick={() => setActiveProvider(activeProvider === provider.id ? null : provider.id)}
                      >
                        <Plug className="h-3 w-3" /> Connect
                      </Button>
                    )}
                  </div>
                </div>

                {/* Config form */}
                {activeProvider === provider.id && (
                  <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 space-y-3">
                    {(CONFIG_FIELDS[provider.id] || []).map((field) => (
                      <div key={field.key}>
                        <label className="text-[10px] font-semibold text-slate-500 mb-1 block">{field.label}</label>
                        <Input
                          type={field.type}
                          placeholder={field.placeholder}
                          value={configValues[field.key] || ""}
                          onChange={(e) => setConfigValues(prev => ({ ...prev, [field.key]: e.target.value }))}
                          className="h-8 text-xs rounded-xl"
                        />
                      </div>
                    ))}
                    {provider.id === "slack" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-[10px] w-full"
                        onClick={() => {
                          window.location.href = `/api/integrations/slack?workspaceId=${workspaceId}`;
                        }}
                      >
                        <ExternalLink className="h-3 w-3 mr-1.5" /> Connect with Slack OAuth
                      </Button>
                    )}
                    {["github", "bitbucket", "asana"].includes(provider.id) && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-8 text-[10px] w-full"
                        onClick={() => {
                          window.location.href = `/api/integrations/${provider.id}/connect?workspaceId=${workspaceId}`;
                        }}
                      >
                        <ExternalLink className="h-3 w-3 mr-1.5" /> Connect with OAuth
                      </Button>
                    )}
                    <div className="flex justify-end gap-2 pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-[10px]"
                        onClick={() => { setActiveProvider(null); setConfigValues({}); }}
                      >
                        Cancel
                      </Button>
                      <Button
                        size="sm"
                        className="h-7 text-[10px]"
                        disabled={connectMutation.isPending}
                        onClick={() => connectMutation.mutate({ provider: provider.id, config: configValues })}
                      >
                        {connectMutation.isPending ? "Connecting..." : connected ? "Update" : "Connect"}
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}

        {isLoading && (
          <div className="py-16 text-center text-slate-400">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-3" />
            <p className="text-sm font-medium">Loading integrations...</p>
          </div>
        )}
      </div>
    </div>
  );
}
