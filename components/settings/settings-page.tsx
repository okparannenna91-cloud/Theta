"use client";

import { useState, useEffect } from "react";
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
import { Select } from "@/components/ui/select";
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
import { toast } from "sonner";

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { preferences, updatePreference, isUpdating } = usePreferences();
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
    <div className="p-4 sm:p-6 lg:p-8 max-w-4xl mx-auto font-sans">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        className="mb-6 lg:mb-8"
      >
        <h1 className="text-3xl font-black tracking-tight mb-2">Settings</h1>
        <p className="text-muted-foreground font-medium">
          Manage your personal preferences and account security.
        </p>
      </motion.div>

      <div className="space-y-8 pb-10">
        {/* Appearance Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Palette className="h-5 w-5 text-indigo-500" />
            <h2 className="text-xl font-bold tracking-tight">Appearance</h2>
          </div>
          <Card className="border-none shadow-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-base font-bold">Interface Theme</CardTitle>
              <CardDescription className="font-medium">
                Select how Theta looks on your device.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <button
                  onClick={() => handleThemeChange("light")}
                  className={`relative flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-300 ${theme === "light"
                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/10 shadow-lg shadow-indigo-500/10"
                    : "border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-white dark:hover:bg-slate-800"
                    }`}
                >
                  {theme === "light" && <Check className="absolute top-2 right-2 h-4 w-4 text-indigo-600 animate-in zoom-in" />}
                  <Sun className={`h-6 w-6 ${theme === "light" ? "text-indigo-600" : "text-slate-400"}`} />
                  <span className={`text-sm font-bold ${theme === "light" ? "text-indigo-600" : "text-slate-600 dark:text-slate-400"}`}>Light</span>
                </button>
                <button
                  onClick={() => handleThemeChange("dark")}
                  className={`relative flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-300 ${theme === "dark"
                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/10 shadow-lg shadow-indigo-500/10"
                    : "border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-white dark:hover:bg-slate-800"
                    }`}
                >
                  {theme === "dark" && <Check className="absolute top-2 right-2 h-4 w-4 text-indigo-600 animate-in zoom-in" />}
                  <Moon className={`h-6 w-6 ${theme === "dark" ? "text-indigo-600" : "text-slate-400"}`} />
                  <span className={`text-sm font-bold ${theme === "dark" ? "text-indigo-600" : "text-slate-600 dark:text-slate-400"}`}>Dark</span>
                </button>
                <button
                  onClick={() => handleThemeChange("system")}
                  className={`relative flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition-all duration-300 ${theme === "system"
                    ? "border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/10 shadow-lg shadow-indigo-500/10"
                    : "border-slate-200 dark:border-slate-800 hover:border-indigo-300 dark:hover:border-indigo-700 hover:bg-white dark:hover:bg-slate-800"
                    }`}
                >
                  {theme === "system" && <Check className="absolute top-2 right-2 h-4 w-4 text-indigo-600 animate-in zoom-in" />}
                  <Laptop className={`h-6 w-6 ${theme === "system" ? "text-indigo-600" : "text-slate-400"}`} />
                  <span className={`text-sm font-bold ${theme === "system" ? "text-indigo-600" : "text-slate-600 dark:text-slate-400"}`}>System</span>
                </button>
              </div>

              <div className="flex items-center justify-between pt-2">
                <div className="space-y-0.5">
                  <Label className="text-base font-bold">Compact Mode</Label>
                  <p className="text-sm text-muted-foreground font-medium">Reduce spacing between elements to show more content.</p>
                </div>
                <Switch
                  checked={compactMode}
                  onCheckedChange={setCompactMode}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Notifications Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Bell className="h-5 w-5 text-orange-500" />
            <h2 className="text-xl font-semibold">Notifications</h2>
          </div>
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">Receive updates about project activities via email.</p>
                </div>
                <Switch
                  checked={emailNotifications}
                  onCheckedChange={setEmailNotifications}
                />
              </div>
              <div className="flex items-center justify-between border-t pt-6">
                <div className="space-y-0.5">
                  <Label className="text-base">Desktop Push Notifications</Label>
                  <p className="text-sm text-muted-foreground">Get real-time alerts directly on your computer.</p>
                </div>
                <Switch
                  checked={pushNotifications}
                  onCheckedChange={setPushNotifications}
                />
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Account & Security Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <Shield className="h-5 w-5 text-emerald-500" />
            <h2 className="text-xl font-semibold">Account & Security</h2>
          </div>
          <Card>
            <CardContent className="pt-6 space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label className="text-base">Two-Factor Authentication</Label>
                  <Badge variant="secondary">Highly Recommended</Badge>
                  <p className="text-sm text-muted-foreground">Add an extra layer of security to your account.</p>
                </div>
                <Button variant="outline">Setup 2FA</Button>
              </div>
              <div className="flex items-center justify-between border-t pt-6 text-destructive">
                <div className="space-y-0.5 text-foreground">
                  <Label className="text-base font-semibold text-destructive">Delete Account</Label>
                  <p className="text-sm text-muted-foreground">Permanently remove your account and all data. This cannot be undone.</p>
                </div>
                <Button variant="destructive">Delete</Button>
              </div>
            </CardContent>
          </Card>
        </section>

        {/* Integrations Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-1">
            <ExternalLink className="h-5 w-5 text-blue-500" />
            <h2 className="text-xl font-semibold">Integrations</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center gap-4 space-y-0">
                <div className="p-2 bg-[#4A154B]/10 rounded-lg">
                  <Slack className="h-6 w-6 text-[#4A154B]" />
                </div>
                <div>
                  <CardTitle className="text-base">Slack</CardTitle>
                  <CardDescription>Send notifications to Slack channels.</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <Button variant="outline" className="w-full" onClick={() => window.open("/api/integrations/slack", "_blank")}>
                  Connect Slack
                </Button>
              </CardContent>
            </Card>

          </div>
        </section>

        <div className="flex justify-end gap-3 pt-4">
          <Button variant="ghost">Cancel</Button>
          <Button className="bg-indigo-600 hover:bg-indigo-700">Save Changes</Button>
        </div>
      </div>
    </div>
  );
}
