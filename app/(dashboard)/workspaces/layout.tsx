import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Workspaces | Theta PM",
  description: "Manage all your workspaces. Organize projects by team or department.",
  path: "/(dashboard)/workspaces",
});

export default function pageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
