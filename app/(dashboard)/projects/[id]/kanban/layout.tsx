import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Project Kanban Board | Theta PM",
  description: "Manage project tasks on a kanban board.",
  path: "/(dashboard)/projects/[id]/kanban",
});

export default function pageLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
