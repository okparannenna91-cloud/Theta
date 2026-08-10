import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "@vibe/core/tokens";
import "leaflet/dist/leaflet.css";
import { ClerkProvider } from "@clerk/nextjs";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { WorkspaceProvider } from "@/components/providers/workspace-provider";
import { AblyProvider } from "@/components/providers/ably-provider";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import { ApiDebugProvider } from "@/components/providers/api-debug-provider";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"], variable: "--font-family" });

export const metadata: Metadata = {
  metadataBase: new URL("https://thetapm.site"),
  title: {
    default: "Theta PM | Advanced AI-Powered Project Management",
    template: "%s | Theta PM AI"
  },
  icons: {
    icon: "/Logo.png",
    apple: "/Logo.png",
  },
  description: "Theta PM is the next evolution of project synchronization. Featuring real-time collaboration, Gantt charts, and strategic portfolio tracking for high-velocity teams.",
  keywords: [
    "project management software",
    "AI project management",
    "saas project tool",
    "team collaboration platform",
    "kanban boards",
    "Teams",
    "real-time collaboration",
    "SaaS Project management",
    "Task management",
    "Project management",
    "real-time gantt charts",
    "theta pm",
    "theta",
    "Theta PM",
    "Theta PM",
    "enterprise project isolation"
  ],
  authors: [{ name: "Theta PM Teams", url: "https://thetapm.site" }],
  creator: "Theta PM Systems",
  publisher: "Theta PM Systems",
  alternates: {
    canonical: './',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: "Theta PM | Orchestrate Your Workflow with AI",
    description: "Ship faster with sub-50ms real-time updates. The most advanced workspace for modern high-performing teams.",
    url: "https://thetapm.site",
    siteName: "Theta PM",
    images: [
      {
        url: "/Logo.png",
        width: 1024,
        height: 1024,
        alt: "Theta PM AI Workspace Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Theta PM | AI-Powered Project Synchronization",
    description: "Experience zero-latency project management with native AI co-piloting. Built for scale.",
    creator: "@theta_pm",
    images: ["/Logo.png"],
  },
  category: "technology",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#7c3aed",
};

import { I18nProvider } from "@/lib/i18n";

import { PopupProvider } from "@/components/popups/popup-manager";
import { CommandPalette } from "@/components/ai/command-palette";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <head>
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#7c3aed" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="Theta PM" />
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        </head>
        <body className={`${inter.variable}`}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
            storageKey="vibe-theme"
          >
            <QueryProvider>
              <WorkspaceProvider>
              <AblyProvider>
                <PostHogProvider>
                  <PopupProvider>
                    <I18nProvider>
                      <ApiDebugProvider>
                        <CommandPalette />
                        <script
                          dangerouslySetInnerHTML={{
                            __html: `
                              if ('serviceWorker' in navigator) {
                                window.addEventListener('load', function() {
                                  navigator.serviceWorker.register('/sw.js').then(function(reg) {
                                    console.log('SW registered:', reg.scope);
                                  }).catch(function(err) {
                                    console.log('SW registration failed:', err);
                                  });
                                });
                              }
                            `,
                          }}
                        />
                        {children}
                        <Toaster richColors position="top-center" />
                      </ApiDebugProvider>
                    </I18nProvider>
                  </PopupProvider>
                </PostHogProvider>
              </AblyProvider>
              </WorkspaceProvider>
            </QueryProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

