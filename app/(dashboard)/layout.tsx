import { Sidebar } from "@/components/layout/sidebar";
import { CommandSearch } from "@/components/layout/command-search";
import { PopupProvider } from "@/components/popups/popup-manager";
import { LanguageSwitcher } from "@/components/layout/language-switcher";
import { OnboardingWrapper } from "@/components/onboarding/onboarding-wrapper";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { BootsAssistant } from "@/components/ai/boots-assistant";
import { NotificationBell } from "@/components/notifications/notification-bell";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PopupProvider>
      <OnboardingWrapper>
        <div className="flex h-screen relative">
          <Sidebar />
          <div className="flex-1 flex flex-col h-screen overflow-hidden">
            <header className="h-16 border-b flex items-center justify-between px-8 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-30">
              <div className="flex items-center gap-4">
                <CommandSearch />
              </div>
              <div className="flex items-center gap-4">
                <NotificationBell />
                <LanguageSwitcher />
              </div>
            </header>
            <main className="flex-1 overflow-y-auto px-8 pt-4">
              <Breadcrumbs />
              {children}
            </main>
          </div>
          <BootsAssistant />
        </div>
      </OnboardingWrapper>
    </PopupProvider>
  );
}

