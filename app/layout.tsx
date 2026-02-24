import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { QueryProvider } from "@/components/providers/query-provider";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { Toaster } from "sonner";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Theta | Advanced Project Management & AI-Powered Workspaces",
  description: "Theta is a high-performance, multi-tenant project management platform. Featuring Gantt charts, real-time collaboration with Ably, AI-powered automation, and strategic portfolio tracking.",
  keywords: [
    "project management",
    "saas",
    "team collaboration",
    "kanban board",
    "gantt chart",
    "timeline view",
    "real-time notifications",
    "AI project management",
    "multi-tenant workspace",
    "time tracking"
  ],
  authors: [{ name: "Theta Teams" }],
  openGraph: {
    title: "Theta | Redefining Project Management",
    description: "Ship faster with real-time updates, AI-driven insights, and enterprise-grade security.",
    url: "https://theta.app",
    siteName: "Theta",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Theta Dashboard Preview",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Theta | Project Management Redefined",
    description: "AI-powered, real-time workspace for modern high-performing teams.",
    images: ["/og-image.png"],
  },
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

