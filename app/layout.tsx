import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  metadataBase: new URL("https://thetapm.site"),
  title: {
    default: "Theta | Advanced AI-Powered Project Management",
    template: "%s | Theta AI"
  },
  description: "Theta is the next evolution of project synchronization. Featuring real-time collaboration, AI-powered automation (Boots AI), Gantt charts, and strategic portfolio tracking for high-velocity teams.",
  keywords: [
    "project management software",
    "AI project management",
    "saas project tool",
    "team collaboration platform",
    "kanban boards",
    "real-time gantt charts",
    "theta pm",
    "boots ai assistant",
    "enterprise project isolation"
  ],
  authors: [{ name: "Theta Teams", url: "https://thetapm.site" }],
  creator: "Theta Systems",
  publisher: "Theta Systems",
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
    title: "Theta | Orchestrate Your Workflow with AI",
    description: "Ship faster with sub-50ms real-time updates and Boots AI. The most advanced workspace for modern high-performing teams.",
    url: "https://thetapm.site",
    siteName: "Theta PM",
    images: [
      {
        url: "/Logo.png",
        width: 1200,
        height: 630,
        alt: "Theta AI Workspace Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Theta | AI-Powered Project Synchronization",
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
};

import { I18nProvider } from "@/lib/i18n";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <ThemeProvider
            attribute="class"
            defaultTheme="dark"
            enableSystem={false}
            disableTransitionOnChange
          >
            <QueryProvider>
              <I18nProvider>
                {children}
                <Toaster richColors position="top-center" />
              </I18nProvider>
            </QueryProvider>
          </ThemeProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}

