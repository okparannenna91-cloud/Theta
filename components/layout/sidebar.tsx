"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Columns,
  Users,
  Bell,
  Activity,
  CreditCard,
  Settings,
  User,
  Menu,
  X,
  Calendar,
  TrendingUp,
  Building2,
  LayoutList,
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { ModeToggle } from "./mode-toggle";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useWorkspace } from "@/hooks/use-workspace";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useI18n } from "@/lib/i18n";
import { motion, AnimatePresence } from "framer-motion";

export function Sidebar() {
  const pathname = usePathname();
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const { t } = useI18n();
  const { workspaces, activeWorkspaceId, switchWorkspace } = useWorkspace();

  const navigation = [
    { name: t("dashboard"), href: "/dashboard", icon: LayoutDashboard },
    { name: t("workspaces"), href: "/workspaces", icon: Building2 },
    { name: t("portfolio"), href: "/portfolio", icon: FolderKanban },
    { name: t("projects"), href: "/projects", icon: LayoutList },
    { name: t("tasks"), href: "/tasks", icon: CheckSquare },
    { name: t("calendar"), href: "/calendar", icon: Calendar },
    { name: t("boards"), href: "/boards", icon: Columns },
    { name: t("teams"), href: "/teams", icon: Users },
    { name: t("notifications"), href: "/notifications", icon: Bell },
    { name: t("analytics"), href: "/analytics", icon: TrendingUp },
    { name: t("activity"), href: "/activity", icon: Activity },
    { name: t("billing"), href: "/billing", icon: CreditCard },
    { name: t("settings"), href: "/settings", icon: Settings },
  ];

  return (
    <>
      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-background border-b h-16 flex items-center justify-between px-4">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Image src="/Logo.png" alt="Theta Logo" width={24} height={24} className="rounded-md border shadow-xs" />
          <span className="text-xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Theta
          </span>
        </Link>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <ModeToggle />
          <UserButton />
          <button
            onClick={() => setIsMobileOpen(!isMobileOpen)}
            className="p-2 rounded-md hover:bg-accent"
            aria-label="Toggle menu"
          >
            {isMobileOpen ? (
              <X className="h-6 w-6" />
            ) : (
              <Menu className="h-6 w-6" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile Overlay */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="lg:hidden fixed inset-0 bg-black/50 z-40 backdrop-blur-sm"
            onClick={() => setIsMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div
        className={cn(
          "fixed lg:static inset-y-0 left-0 z-50 flex h-screen w-72 flex-col border-r bg-background/80 backdrop-blur-xl transition-all duration-500 ease-in-out shadow-[10px_0_30px_-15px_rgba(0,0,0,0.05)]",
          "lg:translate-x-0 border-white/10",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col">
          <div className="flex h-20 items-center justify-between px-8">
            <Link href="/dashboard" className="flex items-center gap-3 group">
              <div className="relative w-10 h-10 rounded-2xl overflow-hidden border-2 border-primary/20 shadow-lg shadow-primary/10 transition-all duration-500 group-hover:scale-110 group-hover:rotate-3 group-hover:border-primary/50">
                <Image src="/Logo.png" alt="Theta Logo" fill className="object-cover" />
              </div>
              <span className="text-2xl font-black tracking-tighter text-gradient group-hover:opacity-80 transition-opacity">
                Theta
              </span>
            </Link>
            <NotificationBell />
          </div>
          <div className="px-6 pb-6 pt-2">
            <Select
              value={activeWorkspaceId || ""}
              onValueChange={switchWorkspace}
            >
              <SelectTrigger className="h-11 px-4 text-xs font-black uppercase tracking-widest bg-secondary/50 border-white/5 hover:bg-secondary transition-all cursor-pointer rounded-2xl shadow-sm">
                <SelectValue placeholder="Select workspace" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl border-white/10 shadow-2xl">
                {workspaces?.map((w: any) => (
                  <SelectItem key={w.id} value={w.id} className="font-black uppercase tracking-widest text-[10px] py-3">
                    {w.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <nav className="flex-1 space-y-1.5 px-4 py-6 overflow-y-auto overflow-x-hidden scrollbar-none">
          {navigation.map((item, i) => {
            const isActive = pathname === item.href;
            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{
                  delay: i * 0.04,
                  type: "spring",
                  stiffness: 200,
                  damping: 25
                }}
              >
                <Link
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    "relative flex items-center gap-4 rounded-2xl px-4 py-3.5 text-xs font-black uppercase tracking-[0.15em] transition-all group",
                    isActive
                      ? "text-primary shadow-lg shadow-primary/5 bg-primary/5 border border-primary/10"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
                  )}
                >
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active-indicator"
                      className="absolute left-0 w-1.5 h-6 bg-primary rounded-r-full z-20"
                      transition={{
                        type: "spring",
                        stiffness: 300,
                        damping: 30
                      }}
                    />
                  )}
                  <div className="relative z-10 flex items-center gap-4 w-full">
                    <item.icon className={cn(
                      "h-5 w-5 flex-shrink-0 transition-all duration-500",
                      isActive ? "text-primary scale-110" : "group-hover:scale-125 group-hover:text-primary group-hover:rotate-6"
                    )} />
                    <span className="flex-1 transition-transform duration-300 group-hover:translate-x-1">{item.name}</span>
                    {isActive && (
                      <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="w-2 h-2 rounded-full bg-primary shadow-[0_0_10px_rgba(139,92,246,0.5)]"
                      />
                    )}
                  </div>
                </Link>
              </motion.div>
            );
          })}
        </nav>

        <div className="p-6 flex flex-col gap-6 mt-auto">
          <div className="hidden lg:block">
            <ModeToggle />
          </div>
          <div className="flex items-center gap-4 p-4 glass rounded-3xl border-primary/10 shadow-xl shadow-primary/5 group cursor-pointer transition-all hover:bg-white/40 dark:hover:bg-slate-800/40">
            <UserButton afterSignOutUrl="/" />
            <Link
              href="/profile"
              className="flex flex-col gap-0.5"
            >
              <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors">Access Profile</span>
              <span className="text-xs font-black uppercase tracking-widest text-foreground flex items-center gap-1.5">
                {t("profile")}
                <User className="h-3 w-3" />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

