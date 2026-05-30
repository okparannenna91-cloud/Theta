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
  Check,
  Zap,
  Globe,
  Lock,
  Code,
  Sparkles
} from "lucide-react";
import { usePreferences } from "@/hooks/use-preferences";
import { useWorkspace } from "@/hooks/use-workspace";
import { toast } from "sonner";
import IntegrationDashboard from "@/components/integrations/integration-dashboard";
import { usePopups } from "@/components/popups/popup-manager";
import { useQuery } from "@tanstack/react-query";

import { MotionWrapper, FadeIn, ScaleIn } from "@/components/common/motion-wrapper";

export default function SettingsPage() {
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

  useEffect(() => {
    if (preferences) {
      setEmailNotifications(preferences.emailNotifications ?? true);
      setPushNotifications(preferences.pushNotifications ?? false);
      setCompactMode(preferences.compactMode ?? false);
    }
  }, [preferences]);

  // Avoid hydration mismatch
  useEffect(() => setMounted(true), []);

  const handleThemeChange = (newTheme: string) => {
    setTheme(newTheme);
    updatePreference({ theme: newTheme });
    toast.success(`Theme updated to ${newTheme}`);
  };

  const handlePreferenceChange = (key: string, value: boolean) => {
    updatePreference({ [key]: value });
    toast.success(`${key.replace(/([A-Z])/g, ' $1').toLowerCase()} updated`);
  };

  const handleDeleteAccount = async () => {
    if (!confirm("Are you absolutely sure? This action is irreversible and all your data will be permanently deleted.")) {
      return;
    }

    try {
      const res = await fetch("/api/user/delete", { method: "DELETE" });
      if (res.ok) {
        toast.success("Account deleted successfully");
        window.location.href = "/";
      } else {
        toast.error("Failed to delete account");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 relative selection:bg-indigo-500/30 overflow-x-hidden">
      {/* Neural Mesh Background */}
      <div className="absolute top-0 right-0 -z-10 w-[800px] h-[800px] bg-indigo-600/5 blur-[120px] rounded-full pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 left-0 -z-10 w-[600px] h-[600px] bg-purple-600/5 blur-[100px] rounded-full pointer-events-none" />

      <MotionWrapper className="p-8 sm:p-12 lg:p-20 max-w-6xl mx-auto relative z-10">
        <div className="mb-20">
          <h1 className="text-6xl sm:text-7xl font-black tracking-tighter mb-6 uppercase leading-none">
            Interface <span className="text-indigo-600">Config</span>
          </h1>
          <div className="flex items-center gap-4">
            <div className="h-1 w-20 bg-indigo-600 rounded-full" />
            <p className="text-xs font-black text-slate-400 uppercase tracking-[0.4em]">
              Personalize your Neural experience and calibrate system parameters.
            </p>
          </div>
        </div>

        <div className="space-y-24 pb-40">
          {/* Appearance Section */}
          <FadeIn delay={0.1}>
            <section className="space-y-10">
              <div className="flex items-center gap-6 px-1">
                <div className="h-14 w-14 rounded-2xl bg-indigo-600/5 flex items-center justify-center border border-indigo-500/10 shadow-2xl shadow-indigo-500/10">
                  <Palette className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-3xl font-black uppercase tracking-tighter">Visual Synthesis</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Calibrate interface aesthetics</p>
                </div>
              </div>
              
              <div className="glass-card border-none rounded-[3rem] overflow-hidden bg-slate-50/20 dark:bg-slate-900/20 backdrop-blur-3xl p-10 sm:p-12">
                <div className="space-y-12">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
                    {[
                      { id: "light", icon: Sun, label: "Photon (Light)" },
                      { id: "dark", icon: Moon, label: "Umbra (Dark)" },
                      { id: "system", icon: Laptop, label: "Sync (System)" },
                    ].map((t) => (
                      <button
                        key={t.id}
                        onClick={() => handleThemeChange(t.id)}
                        className={`relative flex flex-col items-center gap-6 p-12 rounded-[2.5rem] border-2 transition-all duration-700 group ${theme === t.id
                          ? "border-indigo-600 bg-white dark:bg-slate-900 shadow-[0_20px_50px_rgba(79,70,229,0.15)] scale-105"
                          : "border-indigo-500/5 hover:border-indigo-600/30 bg-white/40 dark:bg-slate-900/40"
                          }`}
                      >
                        {theme === t.id && (
                          <motion.div
                            layoutId="theme-active"
                            className="absolute top-4 right-4 h-8 w-8 rounded-full bg-indigo-600 flex items-center justify-center shadow-2xl neural-glow"
                          >
                            <Check className="h-4 w-4 text-white stroke-[3px]" />
                          </motion.div>
                        )}
                        <t.icon className={`h-10 w-10 transition-all duration-700 group-hover:scale-125 ${theme === t.id ? "text-indigo-600" : "text-slate-400"}`} />
                        <span className={`text-[10px] font-black uppercase tracking-[0.3em] ${theme === t.id ? "text-indigo-600" : "text-slate-400"}`}>
                          {t.label}
                        </span>
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between p-10 bg-white/40 dark:bg-slate-900/40 rounded-[2.5rem] border border-indigo-500/5 transition-all hover:bg-white/60 dark:hover:bg-slate-900/60 shadow-sm">
                    <div className="space-y-2">
                      <Label className="text-xl font-black uppercase tracking-tighter">Information Density</Label>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed max-w-md">Activate High-Precision compact mode for professional workflows.</p>
                    </div>
                     <Switch
                      checked={compactMode}
                      onCheckedChange={(val) => {
                         setCompactMode(val);
                         handlePreferenceChange("compactMode", val);
                      }}
                      className="h-8 w-14 data-[state=checked]:bg-indigo-600"
                    />
                  </div>
                </div>
              </div>
            </section>
          </FadeIn>

          {/* Notifications Section */}
          <FadeIn delay={0.2}>
            <section className="space-y-10">
              <div className="flex items-center gap-6 px-1">
                <div className="h-14 w-14 rounded-2xl bg-amber-500/5 flex items-center justify-center border border-amber-500/10 shadow-2xl shadow-amber-500/10">
                  <Bell className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <h2 className="text-3xl font-black uppercase tracking-tighter">Transmission Protocol</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Configure signal distribution</p>
                </div>
              </div>
              
              <div className="glass-card border-none rounded-[3rem] overflow-hidden bg-slate-50/20 dark:bg-slate-900/20 backdrop-blur-3xl">
                <div className="flex flex-col">
                  <div className="flex items-center justify-between p-12 hover:bg-white/40 dark:hover:bg-slate-900/40 transition-all duration-500">
                    <div className="space-y-2">
                      <Label className="text-xl font-black uppercase tracking-tighter">Neural Stream Alerts</Label>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed max-w-md">Receive high-priority updates directly to your neural link (Email).</p>
                    </div>
                     <Switch
                      checked={emailNotifications}
                      onCheckedChange={(val) => {
                          setEmailNotifications(val);
                          handlePreferenceChange("emailNotifications", val);
                      }}
                      className="h-8 w-14 data-[state=checked]:bg-indigo-600"
                    />
                  </div>
                  <div className="flex items-center justify-between p-12 border-t border-indigo-500/5 bg-indigo-500/[0.02] hover:bg-white/40 dark:hover:bg-slate-900/40 transition-all duration-500">
                    <div className="space-y-2">
                      <Label className="text-xl font-black uppercase tracking-tighter">Direct Node Pings</Label>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed max-w-md">Get instant desktop alerts for real-time synchronization updates.</p>
                    </div>
                     <Switch
                      checked={pushNotifications}
                      onCheckedChange={(val) => {
                          setPushNotifications(val);
                          handlePreferenceChange("pushNotifications", val);
                      }}
                      className="h-8 w-14 data-[state=checked]:bg-indigo-600"
                    />
                  </div>
                </div>
              </div>
            </section>
          </FadeIn>

          {/* Account & Security Section */}
          <FadeIn delay={0.3}>
            <section className="space-y-10">
              <div className="flex items-center gap-6 px-1">
                <div className="h-14 w-14 rounded-2xl bg-emerald-500/5 flex items-center justify-center border border-emerald-500/10 shadow-2xl shadow-emerald-500/10">
                  <Shield className="h-6 w-6 text-emerald-500" />
                </div>
                <div>
                  <h2 className="text-3xl font-black uppercase tracking-tighter">Identity Encryption</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Secure your neural credentials</p>
                </div>
              </div>

              <div className="glass-card border-none rounded-[3rem] bg-slate-50/20 dark:bg-slate-900/20 backdrop-blur-3xl p-12 space-y-12">
                <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                  <div className="space-y-4">
                    <div className="flex items-center gap-4">
                      <Label className="text-2xl font-black uppercase tracking-tighter">Biometric Authentication</Label>
                      <Badge variant="secondary" className="bg-emerald-500 text-white font-black uppercase tracking-widest text-[8px] border-none px-3 py-1 shadow-lg shadow-emerald-500/20">
                        SECURED ALPHA
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed max-w-xl">Advanced 2FA encryption layer for high-security node access control.</p>
                  </div>
                   <Button 
                    variant="outline" 
                    className="h-16 px-10 rounded-2xl border-indigo-600/20 text-indigo-600 font-black uppercase tracking-[0.2em] text-[10px] hover:bg-indigo-600 hover:text-white transition-all duration-500 active:scale-95 shadow-xl shadow-indigo-600/5"
                    onClick={() => window.location.href = "/profile"}
                  >
                    Calibrate Security
                  </Button>
                </div>

                <div className="pt-12 border-t border-indigo-500/5">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                    <div className="space-y-2">
                      <Label className="text-xl font-black uppercase tracking-tighter">Protocol Archives</Label>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed">Review our synchronization standards and platform operational terms.</p>
                    </div>
                    <div className="flex gap-6">
                       <Button 
                        variant="ghost" 
                        className="h-14 px-8 rounded-2xl font-black uppercase tracking-[0.2em] text-[9px] hover:bg-indigo-600/5 hover:text-indigo-600 transition-all"
                        onClick={() => window.open("/privacy", "_blank")}
                      >
                        Privacy Shield
                      </Button>
                      <Button 
                        variant="ghost" 
                        className="h-14 px-8 rounded-2xl font-black uppercase tracking-[0.2em] text-[9px] hover:bg-indigo-600/5 hover:text-indigo-600 transition-all"
                        onClick={() => window.open("/terms", "_blank")}
                      >
                        Terms of Service
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="p-12 bg-rose-500/5 dark:bg-rose-500/10 rounded-[3rem] border border-rose-500/20 group hover:bg-rose-500/[0.07] transition-all duration-700">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-10">
                    <div className="space-y-4">
                      <Label className="text-2xl font-black uppercase tracking-tighter text-rose-500">Purge Directive</Label>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest leading-relaxed max-w-xl">Initiate immediate and irreversible removal of all neural nodes and synchronization data.</p>
                    </div>
                     <Button 
                      variant="destructive" 
                      className="h-16 px-12 rounded-2xl font-black uppercase tracking-[0.2em] text-[10px] shadow-2xl shadow-rose-500/20 active:scale-95 transition-all"
                      onClick={handleDeleteAccount}
                    >
                      Initialize Purge
                    </Button>
                  </div>
                </div>
              </div>
            </section>
          </FadeIn>

          {/* Integrations Section */}
          <FadeIn delay={0.4}>
            <section className="space-y-10">
              <div className="flex items-center gap-6 px-1">
                <div className="h-14 w-14 rounded-2xl bg-indigo-600/5 flex items-center justify-center border border-indigo-500/10 shadow-2xl shadow-indigo-500/10">
                  <ExternalLink className="h-6 w-6 text-indigo-600" />
                </div>
                <div>
                  <h2 className="text-3xl font-black uppercase tracking-tighter">Node Bridges</h2>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">External synchronization links</p>
                </div>
              </div>

              <IntegrationDashboard />
            </section>
          </FadeIn>

          {/* Enterprise & API Section */}
          <FadeIn delay={0.5}>
            <section className="space-y-10">
              <div className="flex items-center gap-6 px-1">
                <div className="h-14 w-14 rounded-2xl bg-purple-500/5 flex items-center justify-center border border-purple-500/10 shadow-2xl shadow-purple-500/10">
                  <Code className="h-6 w-6 text-purple-600" />
                </div>
                <div className="flex items-center gap-6">
                  <div>
                    <h2 className="text-3xl font-black uppercase tracking-tighter">Core API Matrix</h2>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">High-level system access</p>
                  </div>
                  <Badge variant="outline" className="bg-purple-600 text-white font-black border-none text-[8px] px-3 py-1 shadow-lg shadow-purple-600/20 uppercase tracking-widest">
                     SYSTEM ROOT
                  </Badge>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* White Labeling */}
                <Card className="glass-card border-none rounded-[3rem] hover:shadow-[0_40px_100px_rgba(139,92,246,0.1)] transition-all duration-700 group overflow-hidden bg-slate-50/20 dark:bg-slate-900/20 backdrop-blur-3xl p-10">
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <div className="h-16 w-16 rounded-2xl bg-purple-600/5 flex items-center justify-center border border-purple-500/10 transition-all group-hover:scale-110">
                        <Globe className="h-7 w-7 text-purple-600" />
                      </div>
                      {["free", "growth", "pro"].includes(currentPlan) && <Lock className="h-5 w-5 text-slate-400/30" />}
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black uppercase tracking-tighter">Branding Cloak</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Remove system signatures and deploy your own visual identity across the matrix.</p>
                    </div>
                     <Button 
                        variant="outline" 
                        className="w-full h-14 rounded-2xl border-dashed border-purple-600/30 font-black uppercase tracking-[0.2em] text-[9px] group-hover:bg-purple-600 group-hover:text-white transition-all duration-500 group-hover:border-transparent group-hover:scale-[1.02]"
                        onClick={() => showUpgradePrompt("white_label")}
                      >
                        {["free", "growth", "pro"].includes(currentPlan) ? (
                          <div className="flex items-center gap-3">Authorize on Plus <Sparkles className="h-3 w-3 animate-pulse" /></div>
                        ) : "Execute Branding"}
                     </Button>
                  </div>
                </Card>

                {/* API Access */}
                <Card className="glass-card border-none rounded-[3rem] hover:shadow-[0_40px_100px_rgba(16,185,129,0.1)] transition-all duration-700 group overflow-hidden bg-slate-50/20 dark:bg-slate-900/20 backdrop-blur-3xl p-10">
                  <div className="space-y-8">
                    <div className="flex items-center justify-between">
                      <div className="h-16 w-16 rounded-2xl bg-emerald-500/5 flex items-center justify-center border border-emerald-500/10 transition-all group-hover:scale-110">
                        <Zap className="h-7 w-7 text-emerald-500" />
                      </div>
                      {["free", "growth"].includes(currentPlan) && <Lock className="h-5 w-5 text-slate-400/30" />}
                    </div>
                    <div className="space-y-2">
                      <h3 className="text-2xl font-black uppercase tracking-tighter">Automation Port</h3>
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-widest leading-relaxed">Programmatic access for high-speed synchronization and external bot integration.</p>
                    </div>
                     <Button 
                        variant="outline" 
                        className="w-full h-14 rounded-2xl border-dashed border-emerald-500/30 font-black uppercase tracking-[0.2em] text-[9px] group-hover:bg-emerald-500 group-hover:text-white transition-all duration-500 group-hover:border-transparent group-hover:scale-[1.02]"
                        onClick={() => showUpgradePrompt("api_access")}
                     >
                        {["free", "growth"].includes(currentPlan) ? (
                          <div className="flex items-center gap-3">Authorize on Pro <Sparkles className="h-3 w-3 animate-pulse" /></div>
                        ) : "Generate Signal Key"}
                     </Button>
                  </div>
                </Card>
              </div>
            </section>
          </FadeIn>

           <div className="flex justify-center pt-20">
             <div className="flex items-center gap-4 bg-slate-100/50 dark:bg-slate-900/50 px-8 py-3 rounded-full border border-indigo-500/5 shadow-sm">
                <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[9px] text-slate-500 font-black uppercase tracking-[0.3em]">
                  Interface synchronized with neural grid v4.0.2
                </p>
             </div>
           </div>
        </div>
      </MotionWrapper>
    </div>
  );
}
