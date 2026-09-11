import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import "@vibe/core/tokens";
import { ClerkProvider } from "@clerk/nextjs";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { WorkspaceProvider } from "@/components/providers/workspace-provider";
import { AblyProvider } from "@/components/providers/ably-provider";
import { PostHogProvider } from "@/components/providers/posthog-provider";
import { ApiDebugProvider } from "@/components/providers/api-debug-provider";
import { Toaster } from "sonner";
import { JsonLd } from "@/components/seo/json-ld";
import { organizationSchema, webSiteSchema } from "@/lib/seo";

const inter = Inter({ subsets: ["latin"], variable: "--font-family" });

const locales = ["en", "es", "fr", "de", "zh", "ar", "ja", "ru"];

const languageAlternates: Record<string, string | null> = {};
for (const l of locales) {
  languageAlternates[l] = l === "en" ? null : `/${l}`;
}

export const metadata: Metadata = {
  metadataBase: new URL("https://www.thetapm.site"),
  title: {
    default: "Theta PM | Project Management for High-Velocity Teams",
    template: "%s | Theta PM"
  },
  icons: {
    icon: "/Logo.png",
    apple: "/Logo.png",
  },
  description: "Theta PM is the next evolution of project synchronization. Featuring real-time collaboration, Gantt charts, and strategic portfolio tracking for high-velocity teams.",
  keywords: [
    "project management software",
    "task management tool",
    "team collaboration platform",
    "kanban boards",
    "real-time collaboration",
    "Gantt charts",
    "theta pm",
    "project management",
    "software development tools",
  ],
  authors: [{ name: "Theta PM Systems", url: "https://www.thetapm.site" }],
  creator: "Theta PM Systems",
  publisher: "Theta PM Systems",
  alternates: {
    canonical: "https://www.thetapm.site",
    languages: languageAlternates,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    title: "Theta PM | Orchestrate Your Workflow",
    description: "Ship faster with sub-50ms real-time updates. The most advanced workspace for modern high-performing teams.",
    url: "https://www.thetapm.site",
    siteName: "Theta PM",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Theta PM Workspace",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Theta PM | Real-Time Project Synchronization",
    description: "Experience zero-latency project management with real-time collaboration. Built for scale.",
    creator: "@theta_pm",
    images: ["/og-image.png"],
  },
  category: "technology",
  other: {
    "theme-color": "#000000",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#000000",
};

import { I18nProvider } from "@/lib/i18n";
import { PopupProvider } from "@/components/popups/popup-manager";
import dynamic from "next/dynamic";

const CommandPalette = dynamic(() => import("@/components/ai/command-palette").then(m => m.CommandPalette), {
  ssr: false,
  loading: () => null,
});

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className="dark" style={{ colorScheme: "dark" }} suppressHydrationWarning>
        <head>
          <link rel="manifest" href="/manifest.json" />
          <meta name="theme-color" content="#000000" />
          <meta name="color-scheme" content="dark" />
          <meta name="mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
          <meta name="apple-mobile-web-app-title" content="Theta PM" />
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
          <JsonLd data={[organizationSchema, webSiteSchema]} />
          <Script
            src="https://challenges.cloudflare.com/turnstile/v0/api.js"
            strategy="afterInteractive"
            crossOrigin="anonymous"
            referrerPolicy="strict-origin-when-cross-origin"
          />
        </head>
        <body className={`${inter.variable} bg-background text-foreground antialiased`} style={{ background: "#000000" }}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            forcedTheme="dark"
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
