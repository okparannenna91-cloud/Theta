import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Kanban Board | Theta PM",
  description: "View and manage your kanban board. Drag, drop, and organize tasks.",
  path: "/(dashboard)/boards/[id]",
});

export default function pageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
