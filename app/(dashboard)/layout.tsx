import { Sidebar } from "@/components/layout/sidebar";
import { CommandSearch } from "@/components/layout/command-search";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { AuthGuard } from "@/components/auth/auth-guard";
import { OnboardingRedirect } from "@/components/providers/onboarding-redirect";
import { MembersProvider } from "@/components/providers/members-provider";
import dynamic from "next/dynamic";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { AppsDropdown } from "@/components/apps/apps-dropdown";
import { ErrorBoundary } from "@/components/ui/error-boundary";

const NovaAssistant = dynamic(() => import("@/components/ai/nova-assistant").then(m => ({ default: m.NovaAssistant })), {
  ssr: false,
  loading: () => <div className="hidden" />,
});

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <OnboardingRedirect>
        <div className="flex h-screen relative">
          <Sidebar />
          <div className="flex-1 flex flex-col h-screen overflow-hidden bg-background">
            <header className="h-14 flex items-center justify-between px-8 z-30">
              <div className="flex items-center gap-4">
                <CommandSearch />
              </div>
              <div className="flex items-center gap-1">
                <AppsDropdown />
                <NotificationBell />
                <LanguageSwitcher />
              </div>
            </header>
            <main className="flex-1 overflow-y-auto px-8 pb-4">
              <ErrorBoundary>
                <MembersProvider>
                  {children}
                </MembersProvider>
              </ErrorBoundary>
            </main>
          </div>
          <NovaAssistant />
        </div>
      </OnboardingRedirect>
    </AuthGuard>
  );
}
