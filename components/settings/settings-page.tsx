"use client";

import { useState, useEffect } from "react";
import React from "react";
import { motion } from "framer-motion";
import { useTheme } from "next-themes";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Palette,
  Bell,
  Shield,
  Smartphone,
  Moon,
  Sun,
  Laptop,
  Slack,
  Calendar,
  ExternalLink,
  Check
} from "lucide-react";
import { usePreferences } from "@/hooks/use-preferences";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";

import { MotionWrapper, FadeIn, ScaleIn } from "@/components/common/motion-wrapper";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { preferences, updatePreference, isUpdating } = usePreferences();
  const { activeWorkspaceId } = useWorkspace();
  const [mounted, setMounted] = useState(false);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [compactMode, setCompactMode] = useState(false);

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), []);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    updatePreference({ theme: newTheme });
    toast.success(`Theme updated to ${newTheme}`);
  };

  if (!mounted) return null;

  return (
    <MotionWrapper className="p-4 sm:p-10 lg:p-12 max-w-5xl mx-auto relative">
      <div className="absolute top-0 right-0 -z-10 w-[600px] h-[600px] bg-primary/5 blur-[120px] rounded-full pointer-events-none" />

      <div className="mb-10 lg:mb-12">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tight mb-3 text-gradient">Settings</h1>
        <p className="text-lg text-muted-foreground font-medium max-w-2xl">
          Personalize your Theta experience and manage your security protocols.
        </p>
      </div>

      <div className="space-y-12 pb-20">
        {/* Appearance Section */}
        <FadeIn delay={0.1}>
          <section className="space-y-6">
            <div className="flex items-center gap-3 px-1">
              <div className="p-2 bg-primary/10 rounded-xl">
                <Palette className="h-6 w-6 text-primary" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">Appearance</h2>
            </div>
            <Card className="glass-card border-none overflow-hidden">
              <CardHeader className="pb-8">
                <CardTitle className="text-xl font-black tracking-tight">Interface Theme</CardTitle>
                <CardDescription className="font-medium text-sm">
                  Select your preferred sensory mode for the application.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-10">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                  {[
                    { id: "light", icon: Sun, label: "Light" },
                    { id: "dark", icon: Moon, label: "Dark" },
                    { id: "system", icon: Laptop, label: "System" },
                  ].map((t) => (
                    <button
                      key={t.id}
                      onClick={() => handleThemeChange(t.id)}
                      className={`relative flex flex-col items-center gap-4 p-8 rounded-3xl border-2 transition-all duration-500 group ${theme === t.id
                        ? "border-primary bg-primary/5 shadow-2xl shadow-primary/10"
                        : "border-secondary hover:border-primary/30 hover:bg-white/40 dark:hover:bg-slate-800/40"
                        }`}
                    >
                      {theme === t.id && (
                        <motion.div
                          layoutId="theme-active"
                          className="absolute top-3 right-3 h-6 w-6 rounded-full bg-primary flex items-center justify-center shadow-lg"
                        >
                          <Check className="h-3.5 w-3.5 text-white stroke-[3px]" />
                        </motion.div>
                      )}
                      <t.icon className={`h-8 w-8 transition-transform duration-500 group-hover:scale-110 ${theme === t.id ? "text-primary" : "text-muted-foreground"}`} />
                      <span className={`text-xs font-black uppercase tracking-[0.2em] ${theme === t.id ? "text-primary" : "text-muted-foreground"}`}>
                        {t.label}
                      </span>
                    </button>
                  ))}
                </div>

                <div className="flex items-center justify-between p-6 glass rounded-2xl border-white/10">
                  <div className="space-y-1">
                    <Label className="text-lg font-black tracking-tight">Compact Mode</Label>
                    <p className="text-sm text-muted-foreground font-medium">Maximize data density across your workspace dashboards.</p>
                  </div>
                  <Switch
                    checked={compactMode}
                    onCheckedChange={setCompactMode}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </CardContent>
            </Card>
          </section>
        </FadeIn>

        {/* Notifications Section */}
        <FadeIn delay={0.2}>
          <section className="space-y-6">
            <div className="flex items-center gap-3 px-1">
              <div className="p-2 bg-amber-500/10 rounded-xl">
                <Bell className="h-6 w-6 text-amber-500" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">Notifications</h2>
            </div>
            <Card className="glass-card border-none">
              <CardContent className="p-0">
                <div className="flex items-center justify-between p-8">
                  <div className="space-y-1">
                    <Label className="text-lg font-black tracking-tight">Email Notifications</Label>
                    <p className="text-sm text-muted-foreground font-medium">Receive high-priority updates about project milestones.</p>
                  </div>
                  <Switch
                    checked={emailNotifications}
                    onCheckedChange={setEmailNotifications}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
                <div className="flex items-center justify-between p-8 border-t border-white/5 bg-white/10 dark:bg-slate-900/10">
                  <div className="space-y-1">
                    <Label className="text-lg font-black tracking-tight">Desktop Push Notifications</Label>
                    <p className="text-sm text-muted-foreground font-medium">Real-time low-latency alerts directly within your OS.</p>
                  </div>
                  <Switch
                    checked={pushNotifications}
                    onCheckedChange={setPushNotifications}
                    className="data-[state=checked]:bg-primary"
                  />
                </div>
              </CardContent>
            </Card>
          </section>
        </FadeIn>

        {/* Account & Security Section */}
        <FadeIn delay={0.3}>
          <section className="space-y-6">
            <div className="flex items-center gap-3 px-1">
              <div className="p-2 bg-emerald-500/10 rounded-xl">
                <Shield className="h-6 w-6 text-emerald-500" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">Account & Security</h2>
            </div>
            <Card className="glass-card border-none">
              <CardContent className="p-8 space-y-8">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                  <div className="space-y-2">
                    <Label className="text-lg font-black tracking-tight">Two-Factor Authentication</Label>
                    <Badge variant="secondary" className="bg-emerald-500/10 text-emerald-600 font-black uppercase tracking-widest text-[9px] border-none ml-2">
                      Secured High
                    </Badge>
                    <p className="text-sm text-muted-foreground font-medium">Enhanced biometric or token-based secondary validation.</p>
                  </div>
                  <Button variant="outline" className="rounded-xl border-primary/20 text-primary font-black uppercase tracking-widest text-xs h-11 px-8 hover:bg-primary hover:text-white transition-all duration-300">
                    Configure 2FA
                  </Button>
                </div>

                <div className="p-8 bg-rose-500/5 dark:bg-rose-500/10 rounded-3xl border border-rose-500/20">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                    <div className="space-y-1 text-foreground">
                      <Label className="text-lg font-black tracking-tight text-rose-500">Danger Zone</Label>
                      <p className="text-sm text-muted-foreground font-medium">Irreversible removal of all workspace data and access credentials.</p>
                    </div>
                    <Button variant="destructive" className="rounded-xl font-black uppercase tracking-widest text-xs h-11 px-8 shadow-lg shadow-rose-500/20">
                      Delete Account
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </section>
        </FadeIn>

        {/* Integrations Section */}
        <FadeIn delay={0.4}>
          <section className="space-y-6">
            <div className="flex items-center gap-3 px-1">
              <div className="p-2 bg-blue-500/10 rounded-xl">
                <ExternalLink className="h-6 w-6 text-blue-500" />
              </div>
              <h2 className="text-2xl font-black tracking-tight">Integrations</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glass-card border-none group overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-3xl -z-10" />
                <CardHeader className="flex flex-row items-center gap-5 space-y-0 p-8">
                  <div className="p-4 bg-[#4A154B]/10 rounded-2xl group-hover:bg-[#4A154B] transition-colors duration-500 group-hover:scale-110">
                    <Slack className="h-8 w-8 text-[#4A154B] group-hover:text-white transition-colors duration-500" />
                  </div>
                  <div>
                    <CardTitle className="text-xl font-black tracking-tight">Slack</CardTitle>
                    <CardDescription className="font-bold text-xs uppercase tracking-wider text-muted-foreground mt-1">Real-time Sync</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="px-8 pb-8 pt-0">
                  <Button
                    variant="outline"
                    className="w-full rounded-2xl h-12 font-black uppercase tracking-[0.2em] text-[10px] border-primary/20 hover:border-primary/50 transition-all duration-300 shadow-sm"
                    onClick={() => window.open(`/api/integrations/slack?workspaceId=${activeWorkspaceId}`, "_blank")}
                    disabled={!activeWorkspaceId}
                  >
                    Authorize Connector
                  </Button>
                </CardContent>
              </Card>
            </div>
          </section>
        </FadeIn>

        <div className="flex justify-end gap-4 pt-10">
          <Button variant="ghost" className="font-black uppercase tracking-widest text-xs h-12 px-8 hover:bg-secondary rounded-2xl transition-all">Cancel</Button>
          <Button className="bg-primary hover:primary/90 text-white font-black uppercase tracking-widest text-xs h-12 px-10 rounded-2xl shadow-[0_10px_30px_-10px_rgba(139,92,246,0.4)] transition-all duration-500 hover:scale-[1.02] active:scale-95">
            Deploy Changes
          </Button>
        </div>
      </div>
    </MotionWrapper>
  );
}
