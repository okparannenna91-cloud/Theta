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
} from "lucide-react";
import { UserButton } from "@clerk/nextjs";
import { ModeToggle } from "./mode-toggle";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { useWorkspace } from "@/hooks/use-workspace";
import { Select } from "@/components/ui/select";
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
    { name: t("projects"), href: "/projects", icon: FolderKanban },
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
          "fixed lg:static inset-y-0 left-0 z-50 flex h-screen w-64 flex-col border-r bg-background transition-transform duration-300 ease-in-out",
          "lg:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col border-b">
          <div className="flex h-16 items-center justify-between px-6">
            <Link href="/dashboard" className="flex items-center gap-2 group">
              <div className="relative w-8 h-8 rounded-lg overflow-hidden border shadow-sm transition-transform group-hover:scale-110">
                <Image src="/Logo.png" alt="Theta Logo" fill className="object-cover" />
              </div>
              <span className="text-2xl font-black bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                Theta
              </span>
            </Link>
            <NotificationBell />
          </div>
          <div className="px-4 pb-4">
            <Select
              value={activeWorkspaceId || ""}
              onChange={(e) => switchWorkspace(e.target.value)}
              className="h-9 text-xs font-semibold bg-accent/50 border-none hover:bg-accent transition-colors cursor-pointer"
            >
              {workspaces?.map((w: any) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </Select>
          </div>
        </div>
        <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto">
          {navigation.map((item, i) => {
            const isActive = pathname === item.href;
            return (
              <motion.div
                key={item.name}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Link
                  href={item.href}
                  onClick={() => setIsMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all group",
                    isActive
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                  )}
                >
                  <item.icon className={cn(
                    "h-5 w-5 flex-shrink-0 transition-transform",
                    !isActive && "group-hover:scale-110"
                  )} />
                  <span>{item.name}</span>
                  {isActive && (
                    <motion.div
                      layoutId="sidebar-active"
                      className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-foreground"
                    />
                  )}
                </Link>
              </motion.div>
            );
          })}
        </nav>
        <div className="border-t p-4 flex flex-col gap-4">
          <div className="hidden lg:block">
            <ModeToggle />
          </div>
          <div className="flex items-center gap-3">
            <UserButton />
            <Link
              href="/profile"
              className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground"
            >
              <User className="h-4 w-4" />
              {t("profile")}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}

