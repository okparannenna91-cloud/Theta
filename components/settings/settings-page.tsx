"use client";

import { useState, useEffect } from "react";
import React from "react";
import { useTheme } from "next-themes";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Settings, Palette, Bell, Shield, Smartphone, Moon, Sun, Laptop,
  Calendar, ExternalLink, Check, Zap, Globe, Lock, Code, Sparkles, Rocket, Terminal,
  Building2, Users, CreditCard, BarChart3
} from "lucide-react";
import { usePreferences } from "@/hooks/use-preferences";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { usePopups } from "@/components/popups/popup-manager";
import { useQuery } from "@tanstack/react-query";

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { showUpgradePrompt } = usePopups();
  const { preferences, updatePreference, isUpdating } = usePreferences();
  const { activeWorkspaceId } = useWorkspace();
  const [mounted, setMounted] = useState(false);

  const { data: workspaceData } = useQuery({
    queryKey: ["workspace-details", activeWorkspaceId],
    queryFn: async () => {
      const res = await fetch(`/api/workspaces/${activeWorkspaceId}`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!activeWorkspaceId
  });

  const currentPlan = workspaceData?.plan || "free";

  const [emailNotifications, setEmailNotifications] = useState(preferences?.emailNotifications ?? true);
  const [pushNotifications, setPushNotifications] = useState(preferences?.pushNotifications ?? false);
  const [compactMode, setCompactMode] = useState(preferences?.compactMode ?? false);
  const [dndEnabled, setDndEnabled] = useState(preferences?.dndEnabled ?? false);
  const [dndStart, setDndStart] = useState(preferences?.dndStart ?? "22:00");
  const [dndEnd, setDndEnd] = useState(preferences?.dndEnd ?? "08:00");
  const [notificationSounds, setNotificationSounds] = useState(preferences?.notificationSounds ?? true);
  const [proactiveSuggestions, setProactiveSuggestions] = useState(preferences?.proactiveSuggestions ?? true);
  const [autoSummarize, setAutoSummarize] = useState(preferences?.autoSummarize ?? true);
  const [taskIntelligence, setTaskIntelligence] = useState(preferences?.taskIntelligence ?? true);

  useEffect(() => {
    if (preferences) {
      setEmailNotifications(preferences.emailNotifications ?? true);
      setPushNotifications(preferences.pushNotifications ?? false);
      setCompactMode(preferences.compactMode ?? false);
      setDndEnabled(preferences.dndEnabled ?? false);
      setDndStart(preferences.dndStart ?? "22:00");
      setDndEnd(preferences.dndEnd ?? "08:00");
      setNotificationSounds(preferences.notificationSounds ?? true);
      setProactiveSuggestions(preferences.proactiveSuggestions ?? true);
      setAutoSummarize(preferences.autoSummarize ?? true);
      setTaskIntelligence(preferences.taskIntelligence ?? true);
    }
  }, [preferences]);

  useEffect(() => setMounted(true), []);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    updatePreference({ theme: newTheme });
    toast.success(`Theme updated to ${newTheme}`);
  };

  const handlePreferenceChange = (key: string, value: any) => {
    updatePreference({ [key]: value });
    toast.success(`${key.replace(/([A-Z])/g, ' $1').toLowerCase()} updated`);
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you absolutely sure? This action is irreversible and all your data will be permanently deleted.")) return;
    try {
      const res = await fetch("/api/user/delete", { method: "DELETE" });
      if (res.ok) { toast.success("Account deleted successfully"); window.location.href = "/"; }
      else { toast.error("Failed to delete account"); }
    } catch { toast.error("An error occurred"); }
  };

  if (!mounted) return null;

  return (
    <div className="pb-10">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Personalize your experience and configure system parameters
        </p>
      </div>

      <div className="space-y-8">
        {/* Appearance */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Palette className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Appearance</h2>
              <p className="text-xs text-muted-foreground">Choose your interface theme</p>
            </div>
          </div>

          <Card className="border shadow-sm">
            <CardContent className="p-5 space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { id: "light", icon: Sun, label: "Light" },
                  { id: "dark", icon: Moon, label: "Dark" },
                  { id: "system", icon: Laptop, label: "System" },
                ].map((t) => (
                  <button key={t.id} onClick={() => handleThemeChange(t.id)}
                    className={`relative flex flex-col items-center gap-3 p-6 rounded-lg border-2 transition-all ${theme === t.id ? "border-primary bg-primary/5" : "border-border hover:border-primary/30 bg-background"}`}>
                    {theme === t.id && (
                      <div className="absolute top-2 right-2 h-5 w-5 rounded-full bg-primary flex items-center justify-center">
                        <Check className="h-3 w-3 text-primary-foreground" />
                      </div>
                    )}
                    <t.icon className={`h-6 w-6 ${theme === t.id ? "text-primary" : "text-muted-foreground"}`} />
                    <span className={`text-xs font-medium ${theme === t.id ? "text-primary" : "text-muted-foreground"}`}>{t.label}</span>
                  </button>
                ))}
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label className="text-sm font-medium">Compact Mode</Label>
                  <p className="text-xs text-muted-foreground">High-density layout for professional workflows</p>
                </div>
                <Switch checked={compactMode} onCheckedChange={(val) => { setCompactMode(val); handlePreferenceChange("compactMode", val); }} />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Notifications */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Bell className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Notifications</h2>
              <p className="text-xs text-muted-foreground">Configure how you receive updates</p>
            </div>
          </div>

          <Card className="border shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label className="text-sm font-medium">Email Notifications</Label>
                  <p className="text-xs text-muted-foreground">Receive updates via email</p>
                </div>
                <Switch checked={emailNotifications} onCheckedChange={(val) => { setEmailNotifications(val); handlePreferenceChange("emailNotifications", val); }} />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label className="text-sm font-medium">Push Notifications</Label>
                  <p className="text-xs text-muted-foreground">Get instant desktop alerts</p>
                </div>
                <Switch checked={pushNotifications} onCheckedChange={(val) => { setPushNotifications(val); handlePreferenceChange("pushNotifications", val); }} />
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label className="text-sm font-medium">Notification Sounds</Label>
                  <p className="text-xs text-muted-foreground">Play a sound when notifications arrive</p>
                </div>
                <Switch checked={notificationSounds} onCheckedChange={(val) => { setNotificationSounds(val); handlePreferenceChange("notificationSounds", val); }} />
              </div>
              <div className="p-4 rounded-lg border space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Do Not Disturb</Label>
                    <p className="text-xs text-muted-foreground">Suppress notifications during quiet hours</p>
                  </div>
                  <Switch checked={dndEnabled} onCheckedChange={(val) => { setDndEnabled(val); handlePreferenceChange("dndEnabled", val); }} />
                </div>
                {dndEnabled && (
                  <div className="flex items-center gap-3 pt-2">
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">From</Label>
                      <input
                        type="time"
                        value={dndStart}
                        onChange={(e) => { setDndStart(e.target.value); handlePreferenceChange("dndStart", e.target.value); }}
                        className="h-8 text-xs rounded-md border bg-background px-2"
                      />
                    </div>
                    <div className="flex items-center gap-2">
                      <Label className="text-xs text-muted-foreground">Until</Label>
                      <input
                        type="time"
                        value={dndEnd}
                        onChange={(e) => { setDndEnd(e.target.value); handlePreferenceChange("dndEnd", e.target.value); }}
                        className="h-8 text-xs rounded-md border bg-background px-2"
                      />
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Security */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Shield className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Security</h2>
              <p className="text-xs text-muted-foreground">Manage your account security</p>
            </div>
          </div>

          <Card className="border shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label className="text-sm font-medium">Two-Factor Authentication</Label>
                  <p className="text-xs text-muted-foreground">Add an extra layer of security to your account</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push("/profile")}>
                  Configure
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label className="text-sm font-medium">Privacy Policy</Label>
                  <p className="text-xs text-muted-foreground">Review our data handling practices</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => window.open("/privacy", "_blank")}>
                  <ExternalLink className="h-4 w-4 mr-1" /> View
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div>
                  <Label className="text-sm font-medium">Terms of Service</Label>
                  <p className="text-xs text-muted-foreground">Platform terms and conditions</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => window.open("/terms", "_blank")}>
                  <ExternalLink className="h-4 w-4 mr-1" /> View
                </Button>
              </div>
              <div className="p-4 rounded-lg border border-destructive/20 bg-destructive/5">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium text-destructive">Delete Account</Label>
                    <p className="text-xs text-muted-foreground">Permanently remove your account and all data</p>
                  </div>
                  <Button variant="destructive" size="sm" onClick={handleDeleteAccount}>Delete</Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Workspace Settings */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Building2 className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Workspace</h2>
              <p className="text-xs text-muted-foreground">Manage workspace settings and billing</p>
            </div>
          </div>

          <Card className="border shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">Current Plan</Label>
                    <p className="text-xs text-muted-foreground capitalize">{currentPlan === "theta_plus" ? "Theta+" : currentPlan}</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push("/billing")}>
                  Manage Billing
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">Team Members</Label>
                    <p className="text-xs text-muted-foreground">Manage who has access to this workspace</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push("/teams")}>
                  Manage Team
                </Button>
              </div>
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <Label className="text-sm font-medium">Usage & Limits</Label>
                    <p className="text-xs text-muted-foreground">View your current resource usage</p>
                  </div>
                </div>
                <Button variant="outline" size="sm" onClick={() => router.push("/analytics")}>
                  View Analytics
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Nova AI */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Sparkles className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Nova AI Assistant</h2>
              <p className="text-xs text-muted-foreground">Configure your AI copilot behavior</p>
            </div>
          </div>

          <Card className="border shadow-sm">
            <CardContent className="p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Proactive Suggestions</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Allow Nova to surface insights and suggestions automatically</p>
                </div>
                <Switch checked={proactiveSuggestions} onCheckedChange={(val) => { setProactiveSuggestions(val); handlePreferenceChange("proactiveSuggestions", val); }} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Auto-Summarize</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">Nova summarizes completed tasks and activity changes</p>
                </div>
                <Switch checked={autoSummarize} onCheckedChange={(val) => { setAutoSummarize(val); handlePreferenceChange("autoSummarize", val); }} />
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Task Intelligence</Label>
                  <p className="text-xs text-muted-foreground mt-0.5">AI analyzes tasks to suggest priorities and effort estimates</p>
                </div>
                <Switch checked={taskIntelligence} onCheckedChange={(val) => { setTaskIntelligence(val); handlePreferenceChange("taskIntelligence", val); }} />
              </div>
              <div className="border-t pt-4 mt-2 space-y-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs h-10 rounded-xl"
                  onClick={() => window.dispatchEvent(new CustomEvent("nova:open", { detail: { prompt: "Show me your recent memories and learnings about my workspace" } }))}
                >
                  <Sparkles className="h-3.5 w-3.5 mr-2 text-primary" />
                  View Nova&apos;s memory & learnings
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full justify-start text-xs h-10 rounded-xl text-muted-foreground"
                  onClick={async () => {
                    await updatePreference({ onboardingComplete: false });
                    router.push("/onboarding");
                  }}
                >
                  <Rocket className="h-3.5 w-3.5 mr-2" />
                  Relaunch Onboarding
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Enterprise */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-purple-500/10 flex items-center justify-center">
              <Code className="h-4 w-4 text-purple-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold">Enterprise</h2>
              <p className="text-xs text-muted-foreground">Advanced features and API access</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="border shadow-sm hover:border-primary/30 transition-colors">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-lg bg-purple-500/10 flex items-center justify-center">
                    <Globe className="h-5 w-5 text-purple-500" />
                  </div>
                  {["free", "growth", "pro"].includes(currentPlan) && <Lock className="h-4 w-4 text-muted-foreground/50" />}
                </div>
                <div>
                  <h3 className="text-sm font-semibold">White Labeling</h3>
                  <p className="text-xs text-muted-foreground mt-1">Remove branding and add your own identity</p>
                </div>
                <Button variant="outline" className="w-full" onClick={() => showUpgradePrompt("white_label")}>
                  {["free", "growth", "pro"].includes(currentPlan) ? (
                    <span className="flex items-center gap-2">Upgrade to Plus <Sparkles className="h-3 w-3" /></span>
                  ) : "Enable"}
                </Button>
              </CardContent>
            </Card>

            <Card className="border shadow-sm hover:border-primary/30 transition-colors">
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Zap className="h-5 w-5 text-emerald-500" />
                  </div>
                  {["free", "growth"].includes(currentPlan) && <Lock className="h-4 w-4 text-muted-foreground/50" />}
                </div>
                <div>
                  <h3 className="text-sm font-semibold">API Access</h3>
                  <p className="text-xs text-muted-foreground mt-1">Programmatic access for automation</p>
                </div>
                <Button variant="outline" className="w-full" onClick={() => showUpgradePrompt("api_access")}>
                  {["free", "growth"].includes(currentPlan) ? (
                    <span className="flex items-center gap-2">Upgrade to Pro <Sparkles className="h-3 w-3" /></span>
                  ) : "Generate API Key"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* MCP Server */}
        <section>
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Terminal className="h-4 w-4 text-blue-500" />
            </div>
            <div>
              <h2 className="text-base font-semibold">MCP Server</h2>
              <p className="text-xs text-muted-foreground">Model Context Protocol for AI integrations</p>
            </div>
          </div>

          <Card className="border shadow-sm">
            <CardContent className="p-5 space-y-4">
              <div className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Terminal className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">Theta MCP Server</h3>
                    <p className="text-xs text-muted-foreground">Connect AI assistants (Claude, GPT) to your workspace via stdio transport</p>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs">10 tools</Badge>
              </div>
              <div className="p-3 rounded-lg bg-muted/50 font-mono text-xs text-muted-foreground overflow-x-auto">
                npx theta-mcp --workspace-id={"<your-workspace-id>"}
              </div>
              <p className="text-xs text-muted-foreground">
                The MCP server provides tools for tasks, projects, boards, search, analytics, and workspace management.
                Configure in your AI client&apos;s MCP settings.
              </p>
            </CardContent>
          </Card>
        </section>

        <div className="text-center pt-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full border bg-muted/30">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-muted-foreground">Settings saved locally</span>
          </div>
        </div>
      </div>
    </div>
  );
}
